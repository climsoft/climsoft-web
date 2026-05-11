FROM rocker/r-ver:4.4.0

# Install the HTTP framework and dependency-management packages.
# Reproducible builds come from the rocker base image, which pins the default
# CRAN mirror to a Posit Package Manager snapshot tied to R 4.4.0's release
# date — so install.packages() resolves the same version on every build.
# User-adapter dependencies are NOT installed here — they are installed
# lazily into per-script renv libraries at first run, cached under
# <scriptDir>/.installed/.
RUN install2.r --error plumber renv jsonlite

# Create app directory
WORKDIR /app

# Copy the plumber server
COPY server.R .

# Expose the HTTP port
EXPOSE 5102

# Run the server
CMD ["Rscript", "server.R"]
