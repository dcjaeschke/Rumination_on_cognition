# Load necessary libraries
library(lavaan)
library(boot)
library(multcomp)
library(dplyr)
library(mediation)
library(readr)


trial_path <- "./data/nback_avg.csv"
qnr_path   <- "./data/mood_CI_BRSI.csv"

nback_data <- read_csv(trial_path, show_col_types = FALSE)
mood_ci_brsi   <- read_csv(qnr_path,   show_col_types = FALSE)


# Assuming both datasets have a common identifier, like "Participant_ID" or row numbers
nback_data <- nback_data %>%
  mutate(Participant_ID = row_number())


mood_ci_brsi <- mood_ci_brsi %>%
  mutate(Participant_ID = row_number())


nback_data <- nback_data %>%
  left_join(mood_ci_brsi %>% dplyr::select(Participant_ID, diff_ci, post_ci_all), by = "Participant_ID")

# Drop the Participant_ID column if not needed anymore
nback_data <- nback_data %>%
  dplyr::select(-Participant_ID)


# List of outcome variables to analyze
outcome_vars <- c(
  "Diff_Overall_Perf", "Diff_Overall_EffRating"
)

# Collect p-values for both methods
mediation_p_values_bootstrap <- c()
mediation_p_values_sem <- c()

# Loop over outcome variables and perform mediation analysis using both methods
for (outcome in outcome_vars) {
  # Exclude rows with NaN values in relevant columns
  relevant_columns <- c(outcome, "Group", "diff_ci")
  clean_data <- na.omit(nback_data[, relevant_columns])
  
  # Skip analysis if clean_data is empty
  if (nrow(clean_data) == 0) {
    cat("\nSkipping analysis for:", outcome, "due to insufficient data.\n")
    next
  }
  
  ### 1. Bootstrapping with Regression Models ###
  # Fit the mediator model
  mediator_model <- lm(diff_ci ~ Group, data = clean_data)
  
  # Fit the outcome model
  outcome_formula <- as.formula(paste(outcome, "~ Group + diff_ci"))
  outcome_model <- lm(outcome_formula, data = clean_data)
  
  # Perform mediation analysis with bootstrapping
  mediation_results <- mediate(
    mediator_model,
    outcome_model,
    treat = "Group",
    mediator = "diff_ci",
    boot = TRUE,
    sims = 1000 # Number of bootstrap simulations
  )
  
  # Extract p-value for the indirect effect
  mediation_summary <- summary(mediation_results)
  p_value_bootstrap <- mediation_summary$d0.p
  mediation_p_values_bootstrap <- c(mediation_p_values_bootstrap, p_value_bootstrap)
  
  # Print the summary for bootstrapping method
  cat("\n[Bootstrap] Mediation analysis for:", outcome, "\n")
  print(mediation_summary)
}