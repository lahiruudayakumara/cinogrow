import pandas as pd
import joblib
import numpy as np
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score, RandomizedSearchCV
from sklearn.metrics import mean_absolute_error, r2_score
from pathlib import Path
import kagglehub
from kagglehub import KaggleDatasetAdapter

# Model file path
BASE = Path(__file__).resolve().parent
# path to save the trained model and metadata
MODEL_FILE = BASE / "oil_yield_model.pkl"

# Load data from Kaggle dataset
def load_data():
    # Load the dataset from Kaggle using kagglehub
    df = kagglehub.load_dataset(
        # Using the Pandas adapter to load the dataset directly into a DataFrame
        KaggleDatasetAdapter.PANDAS,
        # The dataset identifier in Kaggle (username/dataset-name)
        "malmiwithanage/cinnamon-oil-yield",
        # The specific file within the dataset to load
        "cinnamon_oil_yield_dataset.csv",
    )
    # Check if the dataset was loaded successfully
    if df is None:
        # If the dataset could not be loaded, raise an error
        raise FileNotFoundError("Could not load oil yield data from Kaggle dataset.")
    # Return the loaded DataFrame
    return df

# Encode categorical features into numerical values
def encode_features(df):
    # Map the 'Species_Variety' and 'Harvest_Season' columns to numerical values
    df['species_encoded'] = df['Species_Variety'].map({'Sri Gemunu': 0, 'Sri Vijaya': 1})
    # Map the 'Harvest_Season' column to numerical values
    df['season_encoded'] = df['Harvest_Season'].map({'October–December/January': 0, 'May–August': 1})
    # Drop the original categorical columns as they are no longer needed
    return df

# Prepare the data for training
def prepare_data(df):
    # Select the relevant features and target variable for training
    X = df[['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']]
    # The target variable is the oil yield in kilograms
    y = df['Oil_Yield_kg']
    # Split the data into training and testing sets, using 20% of the data for testing
    return train_test_split(X, y, test_size=0.2, random_state=42)

# Define a parameter grid for hyperparameter tuning based on the number of samples in the dataset
def define_param_grid(n_samples):
    n_estimators_min = max(50, n_samples // 2)
    n_estimators_max = min(1000, n_samples * 2)
    
    return {
        'n_estimators': np.linspace(n_estimators_min, n_estimators_max, 5, dtype=int).tolist(),
        'max_depth': list(range(3, min(10, n_samples // 10 + 3))),
        'learning_rate': [0.01, 0.05, 0.1, 0.15],
        'subsample': np.linspace(0.6, 1.0, 5).tolist(),
        'colsample_bytree': np.linspace(0.6, 1.0, 5).tolist(),
        'min_child_weight': list(range(1, min(6, n_samples // 50 + 2))),
    }

# Train the model using the training data and perform hyperparameter tuning
def train(df):
    # Prepare the data for training by splitting it into training and testing sets
    X_train, X_test, y_train, y_test = prepare_data(df)
    # Define the parameter grid for hyperparameter tuning based on the number of samples in the dataset
    param_grid = define_param_grid(len(df))
    # Use RandomizedSearchCV to find the best hyperparameters for the XGBRegressor model
    search = RandomizedSearchCV(
        # Initialize the XGBRegressor with specified parameters for random state, verbosity, regularization alpha and lambda
        estimator=XGBRegressor(random_state=42, verbosity=0, reg_alpha=0.1, reg_lambda=1.5),
        # Define the parameter grid for hyperparameter tuning
        param_distributions=param_grid,
        # Set the number of iterations for the randomized search to 25
        n_iter=25,
        # Use 5-fold cross-validation to evaluate the performance of each set of hyperparameters
        cv=5,
        # Use R-squared as the scoring metric to evaluate the performance of the model
        scoring='r2',
        # Use all available CPU cores to speed up the hyperparameter tuning process
        n_jobs=-1,
        # Set a random state for reproducibility of results
        random_state=42
    )
    # Fit the RandomizedSearchCV to the training data to find the best hyperparameters and train the model
    search.fit(X_train, y_train)
    # Get the best estimator (model) from the search results
    model = search.best_estimator_

    # Make predictions on the test set using the trained model
    y_pred = model.predict(X_test)
    # Calculate the mean absolute error (MAE) and R-squared (R2) score for the predictions on the test set
    mae = mean_absolute_error(y_test, y_pred)
    # Calculate the R-squared score to evaluate the performance of the model on the test set
    r2 = r2_score(y_test, y_pred)

    # Perform cross-validation on the entire dataset to evaluate the model's performance more robustly
    X_full = df[['Leaf_Dry_Weight_kg', 'species_encoded', 'season_encoded']]
    # The target variable for cross-validation is the oil yield in kilograms
    y_full = df['Oil_Yield_kg']
    # Use cross_val_score to evaluate the R-squared score of the model using 5-fold cross-validation on the entire dataset
    cv_scores = cross_val_score(model, X_full, y_full, cv=5, scoring='r2')

    # Save the trained model and relevant metadata to a file using joblib for later use in forecasting
    data = {
        # Store the trained model in the data dictionary
        "model": model,
        # Store the mean absolute error (MAE) of the model's predictions on the test set, rounded to 3 decimal places
        "mae": round(mae, 3),
        # Store the R-squared (R2) score of the model's predictions on the test set, rounded to 3 decimal places
        "r2": round(r2, 3),
        # Store the mean R-squared score from cross-validation, rounded to 3 decimal places
        "cv_r2_mean": round(cv_scores.mean(), 3),
        # Store the standard deviation of the R-squared scores from cross-validation, rounded to 3 decimal places
        "cv_r2_std": round(cv_scores.std(), 3),
        # Store the best hyperparameters found during the randomized search for later reference
        "best_params": search.best_params_,
        # Store the number of samples in the dataset for reference when loading the model later
        "n": len(df),
    }
    # Save the data dictionary containing the model and metadata to a file using joblib with compression for efficient storage
    joblib.dump(data, MODEL_FILE, compress=3)
    return data

# Forecast the oil yield using the trained model, loading it from the file if it exists and is compatible with the current dataset
def forecast_yield():
    # Load the dataset and encode the features to prepare for forecasting
    df = load_data()
    # Encode the categorical features in the dataset to prepare it for forecasting using the trained model
    df = encode_features(df)
    try:
        # Attempt to load the trained model and metadata from the file using joblib
        data = joblib.load(MODEL_FILE)
        # Check if the number of samples in the current dataset matches the number of samples used to train the model, ensuring compatibility
        if data.get("n") != len(df):
            # If the number of samples does not match, raise a ValueError to indicate that the model is not compatible with the current dataset
            raise ValueError
    # If there is an exception (e.g., file not found, incompatible model), train a new model using the current dataset
    except Exception:
        # If there is an error loading the model, print a message indicating that a new model will be trained
        data = train(df)
    # Return the trained model
    return data["model"]