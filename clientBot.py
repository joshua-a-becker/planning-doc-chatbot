import json
from openai import OpenAI

# File paths
chat_history_file = 'ux/chatTranscript.json'
prompt_template_file = 'client_prompt_template.txt'
api_key_file = 'key_to_gpt.txt'

# Read API key and initialize OpenAI client
with open(api_key_file, 'r') as f:
    client = OpenAI(api_key=f.read().strip())

# Read chat history
with open(chat_history_file, 'r') as f:
    chat_history = json.load(f)

# Read prompt template
with open(prompt_template_file, 'r') as f:
    prompt_template = f.read()

# Replace placeholder with chat history
prompt = prompt_template.replace('{conversation_history}', json.dumps(chat_history['messages']))

# Send request to OpenAI API
response = client.chat.completions.create(
    model="gpt-4-0125-preview",
    messages=[{"role": "user", "content": prompt}]
)

# Extract the response
api_response = response.choices[0].message.content

# Append response to chat history
chat_history['messages'].append({"role": "Client Negotiator", "content": api_response})

# Save updated chat history
with open(chat_history_file, 'w') as f:
    json.dump(chat_history, f, indent=2)

print("Response added to chat history.")