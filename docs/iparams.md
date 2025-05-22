# Installation Parameters

This document explains the installation parameters available for configuring the Change Request App.

## Parameter Configuration

To configure these parameters, you need to edit the `iparams.json` file in the app's root directory. This file is used during the app installation process to collect these configuration values.

### Available Parameters

#### 1. Freshservice Plan
- **Parameter name**: `freshservice_plan`
- **Description**: Specifies which Freshservice plan the instance is using to determine appropriate API rate limits
- **Options**: starter, growth, pro, enterprise
- **Default**: enterprise

#### 2. API Safety Margin
- **Parameter name**: `api_safety_margin`
- **Description**: A safety factor (0.0-1.0) to reduce API usage below the maximum limit
- **Default**: 0.7 (70% of the limit)

#### 3. Inventory Software/Services Type ID
- **Parameter name**: `inventory_type_id`
- **Description**: The asset type ID to use when filtering inventory software or services during asset searches
- **Default**: 33000752344

## Finding Your Asset Type ID

To find the correct asset type ID for your Inventory Software/Services:

1. Go to your Freshservice Admin panel
2. Navigate to Asset Management > Asset Types
3. Find the asset type you want to use for inventory software/services
4. The ID will be visible in the URL when you edit that asset type:
   `https://yourdomain.freshservice.com/cmdb/asset_types/{asset_type_id}/edit`

## Configuration Example

Below is an example `iparams.json` file:

```json
{
  "freshservice_plan": {
    "display_name": "Freshservice Plan",
    "description": "Select your Freshservice plan to configure API rate limits",
    "type": "dropdown",
    "options": [
      {
        "label": "Starter",
        "value": "starter"
      },
      {
        "label": "Growth",
        "value": "growth"
      },
      {
        "label": "Pro",
        "value": "pro"
      },
      {
        "label": "Enterprise",
        "value": "enterprise"
      }
    ],
    "required": true,
    "default_value": "enterprise"
  },
  "api_safety_margin": {
    "display_name": "API Safety Margin",
    "description": "Safety margin for API limits (0.1-1.0). Example: 0.7 means 70% of rate limits",
    "type": "number",
    "required": true,
    "default_value": "0.7"
  },
  "inventory_type_id": {
    "display_name": "Inventory Software/Services Type ID",
    "description": "Asset Type ID to use for filtering inventory software or services",
    "type": "number",
    "required": true,
    "default_value": "33000752344"
  }
}
``` 