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

- **Risk-Based Approval Workflow**:
  - **Low Risk Changes**: Move directly to "Pending Approval" state for technical owner approval
  - **Medium/High Risk Changes**: Move to "Pending Review" state for peer review coordination
  - **Workflow Automation**: After peer review completion, Freshservice workflow automator releases approvals to assigned technical owners and/or high-risk CAB
  - **Scheduled State**: Changes move to "Scheduled" status once all required approvals are obtained

- **Data Persistence**:
  - Auto-save form data to Freshworks Data Storage
  - Resume from previously saved drafts
  - Clear data upon successful submission

## Approval Workflow States

### Change Request Status Flow

1. **Submitted**: Initial state when change request is created
2. **Pending Review**: For medium/high risk changes requiring peer review
3. **Pending Approval**: For low risk changes or after peer review completion
4. **Scheduled**: All approvals obtained, ready for implementation during change window

### Risk-Based Routing

- **Low Risk (Score 5-7)**: 
  - Direct routing to "Pending Approval"
  - Technical owners receive approval requests immediately
  
- **Medium Risk (Score 8-11)**: 
  - Initial state: "Pending Review"
  - Peer review coordination task assigned to agent SME
  - After peer review: Workflow automator moves to "Pending Approval"
  
- **High Risk (Score 12-15)**: 
  - Initial state: "Pending Review"
  - Peer review coordination + CAB review requirements
  - After peer review: Workflow automator releases to technical owners and CAB

### Workflow Automation

The Freshservice workflow automator handles state transitions:
- Monitors peer review task completion
- Automatically transitions from "Pending Review" to "Pending Approval"
- Creates approval tickets for identified technical owners
- Escalates to high-risk CAB when required
- Moves to "Scheduled" when all approvals are obtained

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
- Asset Type Names for asset/service searches (default: "Software, IT Software, ISP")
- API rate limit settings based on your Freshservice plan

### Asset Type Configuration

The app uses configurable asset type names to filter assets in the search. This is much more user-friendly than using numeric IDs:

1. During installation, enter your preferred asset type names in the `asset_type_names` field as comma-separated values
2. Examples: 
   - `"Software, IT Software, ISP"` (default)
   - `"Hardware, Servers, Network Equipment"`
   - `"Software"` (single type)
3. The app will automatically find asset types that match these names (exact or partial matches)
4. If left blank, the app will use keyword-based search to find software/service-related asset types
5. You can check the browser console after app initialization to see which asset type IDs were resolved from your configured names

**Finding Your Asset Type Names:**
- Go to Admin → Asset Management → Asset Types in your Freshservice instance
- Note the names of the asset types you want to include in change requests
- Use these exact names (or partial matches) in the configuration

## Usage

1. Navigate to the full-page app in your Freshservice instance
2. Fill out the Change Details form and click Next
3. Complete the Risk Assessment and click Next
4. Search for and select Impacted Assets, then click Submit
5. Review the Change Request summary and confirm submission

Your form data will be automatically saved as you proceed, allowing you to return later to complete the submission.

### Post-Submission Process

After successful submission, the change request follows this workflow:

**For Low Risk Changes:**
- Status: "Pending Approval"
- Technical owners receive approval requests immediately
- Once approved: Status changes to "Scheduled"

**For Medium/High Risk Changes:**
- Status: "Pending Review"
- Agent SME receives peer review coordination task
- After peer review completion: Workflow automator moves to "Pending Approval"
- Technical owners (and CAB for high risk) receive approval requests
- Once all approvals obtained: Status changes to "Scheduled"

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
