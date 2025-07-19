# =============================================================
# Mixed ANOVA & Moderation Analyses (afex / lme4)
# Project: Rumination On Cognition Study
# Author: Denise Chisom Jaeschke
# Date: 2025-06-17
# =============================================================
# Description:
#   1. Load & prepare trial-level data and questionnaire scores
#   2. Derive log-RTs, filter participants by accuracy (>= 50% mean Perf)
#   3. Aggregate to (ID x Time) 
#   4. Run primary induction ANOVAs (Performance, logRTs, Effort)
#   5. Run moderation ANOVAs (Depression / RRS) on Performance & Effort
#   6. Post-hoc: Hits vs Correct Rejections
#   7. Exploratory: Effort ~ Induction controlling Performance 
#   8. Aggregate to (ID x Time) 
#   9. Exploratory: Difficulty as additional within-subject factor
# =============================================================
# Conventions:
#   * Factors: group (RUM vs NEU), pre_post (Pre vs Post), difficulty (load levels)
#   * Moderators (binary): MD_label, RRS_label, Brood_label (thresholded questionnaire scores)
#   * Continuous DVs are z-scored AFTER aggregation (report raw means elsewhere if needed)
# =============================================================

# -----------------------------
# 0. Libraries & Options
# -----------------------------

suppressPackageStartupMessages({
  library(dplyr)
  library(afex)      # aov_car
  library(lme4)      # lmer
  library(lmerTest)  # Satterthwaite dfs
  library(readr)
})

afex_options(type = "III")  # Type III sums (balanced with contrasts)

# ------------------------
# 1. Load and prepare data
# ------------------------

### a) Load data

trial_path <- "./data/nback.csv"
qnr_path   <- "./data/questionnaires.csv"

nback_df <- read_csv(trial_path, show_col_types = FALSE)
qnr_df   <- read_csv(qnr_path,   show_col_types = FALSE)

# Rename time_point for consistency with paper
names(nback_df)[names(nback_df) == "time_point"] <- "pre_post" 
names(nback_df)[names(nback_df) == "load"] <- "difficulty" 


### b) Merge & convert moderator labels

# Merge scores into df
qnr_scores <- qnr_df %>% select(ID, bdi_score, brood_score, rrs_score)
nback_df$ID <- as.character(nback_df$ID)
qnr_scores$ID <- as.character(qnr_df$ID)
df <- left_join(nback_df, qnr_scores, by = "ID")

# Create factor moderator labels based on scores
df <- df %>%
    mutate(
        MD_label    = as.factor(ifelse(bdi_score >= 14, 1, 0)),
        Brood_label = as.factor(ifelse(brood_score >= 11, 1, 0)),
        RRS_label   = as.factor(ifelse(rrs_score >= 24, 1, 0))
    )

# Diagnostics: count participants per category
cat("N MD high:    ", length(unique(df$ID[df$MD_label == 1])), "\n")
cat("N RRS high:   ", length(unique(df$ID[df$RRS_label == 1])), "\n")
cat("N Brood high: ", length(unique(df$ID[df$Brood_label == 1])), "\n")

# Convert moderator labels to factors 
df$MD_label <- as.factor(df$MD_label)
df$RRS_label <- as.factor(df$RRS_label)
df$Brood_label <- as.factor(df$Brood_label)

# -------------------------
# 2. Preprocess data
# -------------------------

# Log-transform RTs 
df$logRTs <- log(df$RTs)

# Filter IDs with mean Perf >= 50
valid_ids <- df %>%
    group_by(ID) %>%
    summarize(mean_perf = mean(Perf, na.rm = TRUE)) %>%
    filter(mean_perf >= 50) %>%
    pull(ID) 
df <- df %>% filter(ID %in% valid_ids)

# ------------------------
# 3. Aggregate by ID & timepoint (two data points per ID --> summary_df_two)
# ------------------------

summary_df_two <- df %>%
    group_by(ID, pre_post) %>%
    summarize(
        Perf = mean(Perf, na.rm = TRUE),
        CorrRejs = mean(CorrRejs, na.rm = TRUE),
        Hits = mean(Hits, na.rm = TRUE),
        EffRating = mean(EffRating, na.rm = TRUE),
        logRTs = mean(logRTs, na.rm = TRUE),
        group = first(group),
        MD_label = first(MD_label),
        Brood_label = first(Brood_label),
        RRS_label = first(RRS_label),
        bdi_score = first(bdi_score),
        brood_score = first(brood_score),
        rrs_score = first(rrs_score),
        .groups = "drop"
    )

# Z-score the continuous variables
summary_df_two <- summary_df_two %>%
    mutate(across(c(Perf, CorrRejs, Hits, EffRating, logRTs), scale))

# Ensure categorical
summary_df_two$ID <- as.factor(summary_df_two$ID)
summary_df_two$group <- as.factor(summary_df_two$group)
summary_df_two$pre_post <- as.factor(summary_df_two$pre_post)

# Use summary_df as the main data for analysis
data <- summary_df_two


# ------------------------
# 4. Run primary induction ANOVAs (Performance, logRTs, Effort)
# ------------------------

cat("\n========== HYPOTHESIS 1: INDUCTION EFFECTS ON PERFORMANCE, RT, EFFORT RATING ==========\n")

main_dvs <- c("Perf", "logRTs", "EffRating" )
results  <- list()

for (dv in main_dvs) {
    
  cat("\n==========", dv, "==========\n")
  
  # formula with Error term for repeated measures (timepoint)
  fml <- as.formula(paste0(dv, " ~ group * pre_post + Error(ID/pre_post)"))
  
  # Run aov_car
  m <- aov_car(formula = fml,
               data    = data,
               factorize = FALSE,   # set to FALSE if group/pre_post aren't factors yet
               anova_table = list(es = "pes")  # pes = partial eta² --> effect size (not reported in paper, but useful for interpretation)
  )
  print(m$anova_table)
  results[[dv]] <- m
}

# ------------------------
# 5. Run moderation ANOVAs (Depression / RRS) on Performance & Effort
# ------------------------

cat("\n========== HYPOTHESIS 2: MODERATION OF INDUCTION EFFECTS ON PERFORMANCE & EFFORT RATING BY DEPRESSION & TRAIT RUMINATION ==========\n")

main_dvs <- c("Perf", "EffRating")
moderators  <- c("MD_label", "RRS_label")
mod_models  <- list()

for (mod in moderators) {
  for (dv in main_dvs) {
    cat("\n---", dv, "moderated by", mod, "---\n")
    
    fml_str <- paste0(dv, " ~ group * pre_post * ", mod, " + Error(ID/pre_post)")
    fml     <- as.formula(fml_str)
    
    # Run aov_car with the moderator
    m <- aov_car(formula = fml,
                 data    = data,
                 factorize = TRUE, 
                 anova_table = list(es = "pes")
    )
    
    # Save model output to nested list
    mod_models[[paste(dv, mod, sep = "_")]] <- m
    
    # Print ANOVA table
    print(m$anova_table)
  }
}

# ------------------------
#   6. Post-hoc: Hits vs Correct Rejections
# ------------------------

cat("\n========== POST-HOC: INDUCTION EFFECTS ON CORRECT REJECTIONS VS. HITS ==========\n")

main_dvs <- c("CorrRejs", "Hits" )
results  <- list()

for (dv in main_dvs) {
  cat("\n==========", dv, "==========\n")
  
  # formula with Error term for repeated measures (timepoint)
  fml <- as.formula(paste0(dv, " ~ group * pre_post + Error(ID/pre_post)"))
  
  # Run aov_car
  m <- aov_car(formula = fml,
               data    = data,
               factorize = FALSE,   # set to FALSE if group/pre_post aren't factors yet
               anova_table = list(es = "pes")  # pes = partial eta² --> effect size (not reported in paper, but useful for interpretation)
  )
  print(m$anova_table)
  results[[dv]] <- m
}

# ------------------------
# 7. Exploratory: Effort ~ Induction controlling Performance (LMM)
# ------------------------

cat("\n========== EXPLORATORY: INDUCTION EFFECTS ON EFFORT RATING ACCOUNTING FOR PERFORMANCE ==========\n")

dv <- "EffRating"
cat("\n==========", dv, "==========\n")
  
# formula with Error term for repeated measures (timepoint)
fml <- as.formula(paste0(dv, " ~ group * pre_post + Error(ID/pre_post)"))
  
# Run aov_car
m <- aov_car(formula = fml,
            data    = data,
            factorize = FALSE,   # set to FALSE if group/pre_post aren't factors yet
           anova_table = list(es = "pes")  # pes = partial eta² --> effect size (not reported in paper, but useful for interpretation)
  )

print(m$anova_table)


# ------------------------
# 8. Aggregate by ID & timepoint & difficulty (6 data points per ID --> summary_df_six)
# ------------------------

summary_df_six <- df %>%
    group_by(ID, pre_post, difficulty) %>%
    summarize(
        Perf = mean(Perf, na.rm = TRUE),
        CorrRejs = mean(CorrRejs, na.rm = TRUE),
        Hits = mean(Hits, na.rm = TRUE),
        EffRating = mean(EffRating, na.rm = TRUE),
        logRTs = mean(logRTs, na.rm = TRUE),
        group = first(group),
        MD_label = first(MD_label),
        Brood_label = first(Brood_label),
        RRS_label = first(RRS_label),
        bdi_score = first(bdi_score),
        brood_score = first(brood_score),
        rrs_score = first(rrs_score),
        .groups = "drop"
    )

# Z-score the continuous variables
summary_df_six <- summary_df_six %>%
    mutate(across(c(Perf, CorrRejs, Hits, EffRating, logRTs), scale))

# Ensure categorical
summary_df_six$ID <- as.factor(summary_df_six$ID)
summary_df_six$group <- as.factor(summary_df_six$group)
summary_df_six$pre_post <- as.factor(summary_df_six$pre_post)

# Use summary_df_six as the main data for analysis
data <- summary_df_six

# ------------------------
#   9. Exploratory: Difficulty as additional within-subject factor
# ------------------------

main_dvs <- c("Perf", "EffRating", "logRTs")
mod_models  <- list()

cat("\n========== EXPLORATORY: INDUCTION EFFECTS MODERATED BY LOAD ==========\n")

for (dv in main_dvs) {
    cat("\n---", dv, "moderated by difficulty (as repeated measure) ---\n")
    
    # Specify Error term for repeated measures: pre_post and difficulty
    fml_str <- paste0(dv, " ~ group * pre_post * difficulty + Error(ID/(pre_post*difficulty))")
    fml     <- as.formula(fml_str)
    
    # Run aov_car with difficulty as within-subject factor
    m <- aov_car(formula = fml,
                             data    = data,
                             factorize = TRUE, 
                             anova_table = list(es = "pes")
    )
    
    # Save model output to nested list
    mod_models[[paste(dv, "difficulty", sep = "_")]] <- m
    
    # Print ANOVA table
    print(m$anova_table)
}
