# import requests
# import json

# # Your Earthdata token pasted directly here
# TOKEN = "AfptRlbvfEELbCDrmtpyVXJyZ4HvFuDXeUYkU7dM"

# # NASA CMR API endpoint
# api_url = "https://cmr.earthdata.nasa.gov/search/granules.json"

# # Parameters: which dataset & how many results to fetch
# params = {
#     "collection_concept_id": "C1980520923-GHRC_DAAC",
#     "page_size": 10
# }

# # Authorization header
# headers = {
#     "Authorization": f"Bearer {TOKEN}"
# }

# # Make the request
# response = requests.get(api_url, params=params, headers=headers)

# # Handle auth or server errors cleanly
# if response.status_code == 401:
#     print("❌ Unauthorized — your Earthdata token is invalid or expired.")
#     print("Visit https://urs.earthdata.nasa.gov/profile to generate a new one.")
#     exit()

# response.raise_for_status()

# # Parse and save the response
# data = response.json()

# with open("output.json", "w") as f:
#     json.dump(data, f, indent=2)

# print("✅ Saved response to output.json")





import requests
import json

# Base URL for EONET v3 API
url = "https://eonet.gsfc.nasa.gov/api/v3/events"

# Parameters — you can tweak these
params = {
    "limit": 5,          # number of events
    "days": 20,          # look back over last 20 days
    "status": "open"     # only open events (could be 'all' or 'closed')
}

# Make GET request (no token needed)
response = requests.get(url, params=params)
response.raise_for_status()

# Parse JSON response
data = response.json()

# Save output to file
with open("output.json", "w") as f:
    json.dump(data, f, indent=2)

print("✅ Saved NASA EONET events to output.json")
