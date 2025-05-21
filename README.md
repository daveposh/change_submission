# Change Request Application for Freshservice

This is a full-page application built using the FDK Freshservice Framework SDK that enables users to create change requests with a structured, multi-step process.

## Features

- **Three-Tab Interface**: Organized workflow for change request creation
  - Change Details
  - Risk Assessment
  - Impacted Assets

- **Change Details Tab**:
  - Search for Requesters and Technical SMEs via API
  - Change Type selection with tooltips
  - Automated Lead Time calculation based on Change Type
  - Planned Start/End date selection
  - Implementation, Backout, and Validation plan input fields

- **Risk Assessment Tab**:
  - Five assessment questions with multiple-choice answers
  - Automated risk score calculation
  - Risk level determination (Low, Medium, High)
  - Risk explanations

- **Impacted Assets Tab**:
  - Search for assets and services via API
  - Add multiple assets to the change request
  - Remove assets from the selection

- **Confirmation Process**:
  - Review all change request details before submission
  - Edit options before final submission

- **Data Persistence**:
  - Auto-save form data to Freshworks Data Storage
  - Resume from previously saved drafts
  - Clear data upon successful submission

## Installation

1. Clone this repository to your local machine.
2. Run `fdk run` to start the app locally for development.
3. Run `fdk pack` to create a packaged version for deployment.
4. Upload the packaged app to your Freshservice instance.

## Development

This app is built using:
- Freshworks Developer Kit (FDK)
- HTML/CSS/JavaScript
- Freshservice REST API
- Freshworks Data Storage API for data persistence

## Configuration

During installation, you'll need to provide:
- Your Freshservice domain
- A valid Freshservice API key with appropriate permissions

## Usage

1. Navigate to the full-page app in your Freshservice instance
2. Fill out the Change Details form and click Next
3. Complete the Risk Assessment and click Next
4. Search for and select Impacted Assets, then click Submit
5. Review the Change Request summary and confirm submission

Your form data will be automatically saved as you proceed, allowing you to return later to complete the submission.

## API Usage

This app uses the following Freshservice API endpoints:
- `/api/v2/requesters` - For searching requesters
- `/api/v2/agents` - For searching agents (Technical SMEs)
- `/api/v2/assets` - For searching assets
- `/api/v2/services` - For searching services

## Data Storage

The app uses Freshworks Data Storage API for persisting form data:
- Uses key-value storage for saving draft change request data
- Automatically saves form data as the user progresses
- Loads saved data when the app is reopened
- Clears saved data after successful submission

## License

Copyright © 2023 Freshworks Inc.
