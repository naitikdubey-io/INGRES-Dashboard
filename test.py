import requests
res = requests.post('http://localhost:8000/api/chat', json={"query": "hello"})
print(res.status_code)
print(res.text)
