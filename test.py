import requests

print("Begining!")
url = "http://localhost:8000/graph"

request_body = {
    "caseText": "患者，男性，65岁，因突发胸痛3小时入院。",
    "model": "CAML",
    "params": {
        "topK": 10,
        "threshold": 0.5
    }
}

response = requests.post(url, json=request_body, headers={
    'Content-Type': 'application/json',
    'Accept': 'application/json'
})

print(response.json())
