##
## Climsoft R adapter runner.
##
## A small plumber HTTP wrapper that executes user-supplied R adapter scripts
## in a controlled, per-script renv library. Dependencies are installed into
## <scriptDir>/.installed/ on first run. Log files are written to outputDir.
##
## A run is one OS process, and that is deliberate — unlike the DuckDB runner,
## which shares one long-lived engine, this runner cannot amortise anything
## across runs without giving up the three jobs the process is doing at once:
## isolating one adapter's loaded packages from another's, giving the timeout
## something it can actually kill, and containing a crash. What IS amortised is
## the per-adapter renv library, below.
##
## The script's working directory is the OPERATION directory. Previously it was
## whatever the runner's own cwd happened to be (/app), so two concurrent runs
## shared it and anything written relative to cwd landed next to the server.
## A script that needs a file shipped beside it has CLIMSOFT_SCRIPT_DIR.
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
## Written INSIDE .installed/ only after renv finishes cleanly, and holds a
## fingerprint of what was installed. Its presence is the "this library is
## usable" signal; the directory existing is not — and here that mattered more
## than in the other runners, because the directory was created BEFORE the
## install was attempted, so any failure left a directory that made every later
## run skip the install and fail on a missing package, permanently.
INSTALL_MARKER_NAME <- ".climsoft-install-ok"
## How long a timed-out script gets to exit on SIGTERM before SIGKILL.
KILL_GRACE_SECONDS <- 5

health_handler <- function() {
  list(status = "ok", runtime = "r", version = paste(R.version$major, R.version$minor, sep = "."))
}

##
## Identifies what should be installed: the contents of renv.lock and
## DESCRIPTION, or the absence of both. Content rather than mtime, so
## re-uploading an unchanged adapter does not force a reinstall.
##
dependency_fingerprint <- function(script_dir) {
  parts <- character(0)
  for (name in c("renv.lock", "DESCRIPTION")) {
    path <- file.path(script_dir, name)
    if (file.exists(path)) {
      parts <- c(parts, paste0(name, ":", unname(tools::md5sum(path))))
    }
  }
  if (length(parts) == 0) "none" else paste(parts, collapse = "|")
}

## TRUE when env_dir holds a library installed for this fingerprint.
install_is_current <- function(env_dir, fingerprint) {
  marker <- file.path(env_dir, INSTALL_MARKER_NAME)
  if (!file.exists(marker)) return(FALSE)
  recorded <- tryCatch(trimws(paste(readLines(marker, warn = FALSE), collapse = "")),
                       error = function(e) "")
  identical(recorded, fingerprint)
}

##
## Make sure env_dir holds this adapter's current dependencies. Returns
## list(ok = TRUE) or list(ok = FALSE, msg = "...").
##
## Two things this does that a plain "does the directory exist?" test cannot:
##
##   - A FAILED install is not cached. The marker is written only after renv
##     returns, so a half-finished install is retried by the next request
##     instead of leaving the adapter permanently broken.
##
##   - An EDITED renv.lock or DESCRIPTION is picked up, because the marker holds
##     a fingerprint of them. (Packages dropped from the file are not removed —
##     renv is asked to install what is now declared, not to prune.)
##
## There is no lock around this, unlike the Python runner's flock. Plumber
## serves requests one at a time in a single process, so two installs for one
## adapter cannot overlap here. If this runner is ever scaled to several
## replicas sharing the adapters volume, it needs one.
##
ensure_library <- function(script_dir, env_dir, install_log, timeout_secs) {
  fingerprint <- dependency_fingerprint(script_dir)

  ## Fast path, taken by every request after the first.
  if (install_is_current(env_dir, fingerprint)) {
    return(list(ok = TRUE))
  }

  ## Cap network operations. renv has no wall-clock timeout of its own, so we
  ## set base R's internet timeout (honored by download.file and friends under
  ## the hood) to bound individual package downloads. Same "at least 600s, or
  ## the request timeout if larger" convention as the Python and JavaScript
  ## runners' install budgets.
  old_timeout <- getOption("timeout")
  options(timeout = max(timeout_secs, 600))
  on.exit(options(timeout = old_timeout), add = TRUE)

  result <- tryCatch({
    dir.create(env_dir, recursive = TRUE, showWarnings = FALSE)
    lockfile <- file.path(script_dir, "renv.lock")
    desc_file <- file.path(script_dir, "DESCRIPTION")

    sink(install_log)
    on.exit(try(sink(), silent = TRUE), add = TRUE)
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
    ## Appended, not written: `writeLines` to the path would truncate the log
    ## renv just produced, throwing away the output that says what failed.
    try(cat(paste0("Install error: ", conditionMessage(e), "\n"),
            file = install_log, append = TRUE), silent = TRUE)
    list(ok = FALSE, msg = conditionMessage(e))
  })

  if (!isTRUE(result$ok)) {
    return(result)
  }

  ## Last, and only on success — this is what the fast path trusts.
  marker_written <- tryCatch({
    writeLines(fingerprint, file.path(env_dir, INSTALL_MARKER_NAME))
    TRUE
  }, error = function(e) FALSE)
  if (!marker_written) {
    return(list(ok = FALSE, msg = "Failed to record the install marker"))
  }

  list(ok = TRUE)
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

  # Step 1: make sure the per-adapter renv library exists and matches this
  # adapter's current dependency files. Does nothing after the first run, or
  # after a run that follows an edit to renv.lock / DESCRIPTION.
  install <- ensure_library(script_dir, env_dir, install_log, timeout_secs)
  if (!isTRUE(install$ok)) {
    return(list(
      status = "failure", durationMs = 0, exitCode = -1,
      errorType = "INSTALL_FAILED",
      errorMessage = paste("renv restore failed:", install$msg)
    ))
  }

  # Step 2: run the script with the right env vars
  env_vars <- c(
    paste0("CLIMSOFT_INPUT_FILE_PATH_NAME=", input_file_path_name),
    paste0("CLIMSOFT_OUTPUT_DIR=", output_dir),
    paste0("CLIMSOFT_METADATA_FILE=", metadata_file),
    paste0("CLIMSOFT_WARNINGS_FILE=", warnings_file),
    paste0("CLIMSOFT_SCRIPT_DIR=", script_dir),
    paste0("CLIMSOFT_RUNNER=r"),
    paste0("R_LIBS_USER=", env_dir)
  )

  # The script runs in the operation directory. `system2` has no cwd argument,
  # so the runner's own working directory is changed for the duration and put
  # back afterwards. That is safe ONLY because plumber serves one request at a
  # time; with concurrent handlers this would need `sh -c 'cd ... && exec ...'`
  # instead.
  old_wd <- getwd()
  on.exit(setwd(old_wd), add = TRUE)
  if (dir.exists(op_dir)) {
    setwd(op_dir)
  }

  # Run under coreutils `timeout` rather than relying on system2's own, because
  # system2 signals the direct child only: a script that shells out leaves its
  # grandchildren running, holding the operation directory and still writing to
  # it after the run has been reported as timed out. `timeout` places the
  # command in its own process group and signals the GROUP, then escalates to
  # SIGKILL after --kill-after.
  #
  # system2's timeout is kept as a backstop, set beyond the budget `timeout`
  # itself enforces, so it only fires if `timeout` were to wedge.
  start_time <- proc.time()["elapsed"]
  exit_code <- tryCatch({
    system2(
      "timeout",
      args = c("--signal=TERM",
               paste0("--kill-after=", KILL_GRACE_SECONDS, "s"),
               paste0(timeout_secs, "s"),
               "Rscript", shQuote(entry_path)),
      stdout = stdout_file, stderr = stderr_file,
      env = env_vars, timeout = timeout_secs + KILL_GRACE_SECONDS + 10
    )
  }, error = function(e) {
    writeLines(paste("Runner error:", conditionMessage(e)), stderr_file)
    -1L
  })
  duration_ms <- as.integer((proc.time()["elapsed"] - start_time) * 1000)

  # 124 is `timeout`'s own "time limit reached" status, and also what system2
  # reports if its backstop fires. 137 is 128+SIGKILL, i.e. the script ignored
  # SIGTERM and was killed after the grace period.
  if (exit_code == 124L || exit_code == 137L) {
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
