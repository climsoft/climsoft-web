"""
Lightweight Flask HTTP wrapper around the csv2bufr Python package.
Provides a /transform endpoint that reads an intermediate CSV from
a shared volume, converts it to BUFR format, writes the output
files to a shared volume, and returns the file paths.
"""

import json
import os
import traceback
import uuid

from flask import Flask, request, jsonify
from csv2bufr import transform

app = Flask(__name__)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'}), 200


@app.route('/transform', methods=['POST'])
def transform_csv_to_bufr():
    """
    Transform a CSV file to BUFR format.

    Expects JSON body:
      {
        "input_file": "/app/exports/intermediate.csv",
        "mappings": { ... daycli-template JSON ... },
        "output_dir": "/app/exports"
      }

    Returns JSON:
      {
        "success": true,
        "output_files": ["/app/exports/abc123.bufr4"],
        "metadata": [{ ... GeoJSON ... }],
        "errors": []
      }
    """
    try:
        body = request.get_json()

        if not body:
            return jsonify({
                'success': False,
                'errors': ['Request body must be JSON']
            }), 400

        input_file = body.get('input_file')
        mappings = body.get('mappings')
        output_dir = body.get('output_dir')

        missing = []
        if not input_file:
            missing.append('input_file')
        if not mappings:
            missing.append('mappings')
        if not output_dir:
            missing.append('output_dir')

        if missing:
            return jsonify({
                'success': False,
                'errors': [f'Missing required fields: {", ".join(missing)}']
            }), 400

        if not os.path.isfile(input_file):
            return jsonify({
                'success': False,
                'errors': [f'Input file not found: {input_file}']
            }), 404

        os.makedirs(output_dir, exist_ok=True)

        with open(input_file, 'r') as f:
            csv_data = f.read()

        output_files = []
        metadata_list = []
        errors = []

        try:
            results = transform(csv_data, mappings)

            for idx, result in enumerate(results):
                bufr_data = result.get('bufr4')
                meta = result.get('_meta')

                if bufr_data is None:
                    errors.append(f'Row {idx}: No BUFR data produced')
                    continue

                output_filename = f'{uuid.uuid4().hex}.bufr4'
                output_path = os.path.join(output_dir, output_filename)

                with open(output_path, 'wb') as out_f:
                    out_f.write(bufr_data)

                output_files.append(output_path)

                if meta:
                    metadata_list.append(meta)

        except Exception as transform_err:
            errors.append(f'Transform error: {str(transform_err)}')
            app.logger.error(f'Transform error: {traceback.format_exc()}')

        success = len(output_files) > 0

        return jsonify({
            'success': success,
            'output_files': output_files,
            'metadata': metadata_list,
            'errors': errors
        }), 200 if success else 500

    except Exception as e:
        app.logger.error(f'Unexpected error: {traceback.format_exc()}')
        return jsonify({
            'success': False,
            'errors': [f'Unexpected server error: {str(e)}']
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('CSV2BUFR_PORT', 5001))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug)
