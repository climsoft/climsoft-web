##
## Climsoft R adapter runner.
##
## A small plumber HTTP wrapper that executes user-supplied R adapter scripts
## in a controlled, per-script renv library. Dependencies are installed into
## <scriptDir>/.installed/ on first run. Log files are written to outputDir.
##

library(plumber)
library(jsonlite)

INSTALLED_DIR_NAME <- ".installed"
## Entry point is a language convention (`main.R`) enforced by the API at
## upload-preview time — hardcoded here so it doesn't need to travel in the
## request body.
ENTRY_POINT <- "main.R"
## Volume mount points inside this container. Hardcoded to match every
## docker-compose profile (dev / test / prod). Callers pass only IDs.
ADAPTERS_ROOT <- "/app/adapters"
OPERATIONS_ROOT <- "/app/operations"

health_handler <- function() {
  list(status = "ok", runtime = "r", version = paste(R.version$major, R.version$minor, sep = "."))
}

run_handler <- function(req) {
  body <- req$body

  required <- c("scriptDirName", "operationId", "inputRelPath", "outputRelPath", "timeoutSeconds")
  missing <- setdiff(required, names(body))
  if (length(missing) > 0) {
    return(list(
      status = "failure", durationMs = 0, exitCode = -1,
      errorType = "RUNTIME_ERROR",
      errorMessage = paste("Missing required fields:", paste(missing, collapse = ", "))
    ))
  }

  # Resolve full paths from the hardcoded roots + wire-supplied IDs.
  script_dir     <- file.path(ADAPTERS_ROOT, body$scriptDirName)
  op_dir         <- file.path(OPERATIONS_ROOT, body$operationId)
  input_file_path_name <- file.path(op_dir, body$inputRelPath)
  output_dir     <- file.path(op_dir, body$outputRelPath)
  timeout_secs   <- as.integer(body$timeoutSeconds)

  # Derive paths by convention inside outputDir.
  env_dir        <- file.path(script_dir, INSTALLED_DIR_NAME)
  metadata_file  <- file.path(output_dir, "metadata.json")
  warnings_file  <- file.path(output_dir, "warnings.jsonl")
  stdout_file    <- file.path(output_dir, "stdout.log")
  stderr_file    <- file.path(output_dir, "stderr.log")
  install_log    <- file.path(output_dir, "install.log")

  entry_path <- file.path(script_dir, ENTRY_POINT)
  if (!file.exists(entry_path)) {
    return(list(
      status = "failure", durationMs = 0, exitCode = -1,
      errorType = "RUNTIME_ERROR",
      errorMessage = paste("Entry point not found:", entry_path)
    ))
  }

  # Step 1: set up the per-script renv library if it doesn't exist yet
  if (!dir.exists(env_dir)) {
    result <- tryCatch({
      dir.create(env_dir, recursive = TRUE, showWarnings = FALSE)
      lockfile <- file.path(script_dir, "renv.lock")
      desc_file <- file.path(script_dir, "DESCRIPTION")

      sink(install_log)
      if (file.exists(lockfile)) {
        cat("Restoring from renv.lock\n")
        renv::restore(project = script_dir, library = env_dir, lockfile = lockfile, prompt = FALSE)
      } else if (file.exists(desc_file)) {
        cat("Installing from DESCRIPTION\n")
        renv::install(project = script_dir, library = env_dir, prompt = FALSE)
      } else {
        cat("No renv.lock or DESCRIPTION found. Skipping install.\n")
      }
      sink()
      list(ok = TRUE)
    }, error = function(e) {
      try(sink(), silent = TRUE)
      writeLines(paste("Install error:", conditionMessage(e)), install_log)
      list(ok = FALSE, msg = conditionMessage(e))
    })

    if (!result$ok) {
      return(list(
        status = "failure", durationMs = 0, exitCode = -1,
        errorType = "INSTALL_FAILED",
        errorMessage = paste("renv restore failed:", result$msg)
      ))
    }
  }

  # Step 2: run the script with the right env vars
  env_vars <- c(
    paste0("CLIMSOFT_INPUT_FILE_PATH_NAME=", input_file_path_name),
    paste0("CLIMSOFT_OUTPUT_DIR=", output_dir),
    paste0("CLIMSOFT_METADATA_FILE=", metadata_file),
    paste0("CLIMSOFT_WARNINGS_FILE=", warnings_file),
    paste0("CLIMSOFT_RUNNER=r"),
    paste0("R_LIBS_USER=", env_dir)
  )

  start_time <- proc.time()["elapsed"]
  exit_code <- tryCatch({
    res <- system2(
      "Rscript", args = entry_path,
      stdout = stdout_file, stderr = stderr_file,
      env = env_vars, timeout = timeout_secs
    )
    res
  }, error = function(e) {
    writeLines(paste("Runner error:", conditionMessage(e)), stderr_file)
    -1L
  })
  duration_ms <- as.integer((proc.time()["elapsed"] - start_time) * 1000)

  if (exit_code == 124L) {
    return(list(
      status = "timeout", durationMs = duration_ms, exitCode = 124,
      errorType = "TIMEOUT",
      errorMessage = paste("Script exceeded timeout of", timeout_secs, "seconds")
    ))
  }

  if (exit_code == 0L) {
    return(list(
      status = "success", durationMs = duration_ms, exitCode = 0
    ))
  }

  error_type <- if (exit_code == 2L) "OUTPUT_INVALID" else "RUNTIME_ERROR"
  list(
    status = "failure", durationMs = duration_ms, exitCode = exit_code,
    errorType = error_type,
    errorMessage = paste("Script exited with code", exit_code, "- see stderr.log")
  )
}

# Build the router programmatically so handlers see the global environment
# (where INSTALLED_DIR_NAME is defined) and so the file isn't re-parsed by plumber.
port <- as.integer(Sys.getenv("R_RUNNER_PORT", "5102"))
pr <- Plumber$new()
pr$handle("GET", "/health", health_handler)
pr$handle("POST", "/run", run_handler, serializer = serializer_unboxed_json())
pr$run(host = "0.0.0.0", port = port)
