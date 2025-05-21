"# Rate Limit Installation Parameters" 

To configure rate limits during app installation, you need to update your app's manifest.json file to include the following configuration parameters:

## Manifest Configuration

Add the following to your manifest.json file:

```json
"iparams": {
  "freshservice_plan": {
    "display_name": "Freshservice Plan",
    "description": "Select your Freshservice plan to set appropriate API rate limits",
    "type": "dropdown",
    "options": [
      {
        "display_name": "Starter",
        "value": "starter"
      },
      {
        "display_name": "Growth",
        "value": "growth"
      },
      {
        "display_name": "Pro",
        "value": "pro"
      },
      {
        "display_name": "Enterprise",
        "value": "enterprise"
      }
    ],
    "default_value": "enterprise",
    "required": true
  },
  "api_safety_margin": {
    "display_name": "API Safety Margin",
    "description": "Percentage of API rate limits to use (0.7 = 70%)",
    "type": "text",
    "default_value": "0.7",
    "required": true
  }
}
```

## How It Works

1. During app installation, administrators will be prompted to:
   - Select their Freshservice plan (Starter, Growth, Pro, Enterprise)
   - Set the API safety margin (default 70%)

2. The app will use these values to determine how many API requests it can make:
   - Each plan has different rate limits 
   - The safety margin prevents hitting those limits

## Rate Limits by Plan

| Action            | Starter | Growth | Pro  | Enterprise |
|-------------------|---------|--------|------|------------|
| Overall Limit     | 100     | 200    | 400  | 500        |
| List All Agents   | 40      | 70     | 120  | 140        |
| List All Requesters | 40    | 70     | 120  | 140        |

## Changing Settings After Installation

If you need to change these settings after installation, an administrator can:
1. Go to the Freshservice Admin panel
2. Navigate to Apps > Installed Apps
3. Find your app and click 'Configure'
4. Update the settings and save

No UI component is needed within the application since these settings are managed at the admin/installation level. 
