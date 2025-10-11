# Cinnamon Pest & Disease Dataset: Collected by Farmers for ML Training

A dataset collection and machine learning pipeline for detecting pests and diseases in cinnamon leaves, with active farmer participation.

## Table of Contents
- [Introduction](#introduction)
- [Data Collection by Farmers](#data-collection-by-farmers)
- [Dataset Structure](#dataset-structure)
- [Data Storage & Management](#data-storage--management)
- [Machine Learning Pipeline](#machine-learning-pipeline)
- [Future Work](#future-work)
- [Contact](#contact)

## Introduction
This project aims to create a comprehensive dataset of cinnamon leaves, including healthy, pest-infected, and diseased samples, to train a Sinhala-supporting machine learning model. The final goal is to assist farmers in real-time identification of pests and diseases, improving crop yield and reducing losses.

## Data Collection by Farmers
Farmers actively contribute by capturing images of cinnamon leaves in their farms using smartphones and labeling them as:
- **Healthy**
- **Pest-infected**
- **Diseased**

Additional metadata recorded includes:
- Farm location
- Date and time of capture
- Pest or disease type (if known)
- Severity level (low, medium, high)

All images and metadata are uploaded to a centralized storage system (Google Drive), ensuring proper dataset management and accessibility for preprocessing.

## Dataset Structure
The dataset is organized hierarchically by category and severity:

~~~
dataset/
├── healthy/
├── pests/
│   ├── low/
│   ├── medium/
│   └── high/
└── diseases/
├── low/
├── medium/
└── high/
~~~

## Data Storage & Management
- Farmers use smartphones to capture images.
- Images are stored on Google Drive and synced with the backend.
- Metadata is stored in JSON or CSV format for easy integration with the ML pipeline.

