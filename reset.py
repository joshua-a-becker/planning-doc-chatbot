import os
os.chdir("/Users/joshua/Dropbox/academia/Research/ChatBot/PrepPartner")

import json

### load blank
with open('chatTranscript_blank.json', 'r') as file:
    chat_history = json.load(file)['messages']

with open('formData_blank.json', 'r') as file:
    form_data = json.load(file)


# save blank chat history to file
f = open("ux/chatTranscript.json", "w")
f.write(json.dumps({"messages": chat_history}))
f.close()

# save blank form data to file
f = open("ux/formData.json", "w")
f.write(json.dumps(form_data))
f.close()


# clear user input
f = open("ux/user-input.txt", "w")
f.write(" ")
f.close()
