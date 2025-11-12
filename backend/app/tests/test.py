import requests

url = "http://127.0.0.1:8000"
endpoint = "/explain"
path = url + endpoint

response = requests.get(path)
print(f"Status Code: {response.status_code}")
print(f"Response: {response.json()}")