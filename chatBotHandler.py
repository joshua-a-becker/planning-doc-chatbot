import os
import sys
import json
from openai import OpenAI

# Change to project directory
localdir = open('../localdir.txt', 'r').read().strip()
os.chdir(localdir)

from db_handler import db

print("startup chatbothandler")

# Get arguments
user_id = sys.argv[1]
user_session_id = sys.argv[2]  # Not used but kept for compatibility
user_input = sys.argv[3]

print("User: " + user_id)
print("User input: " + user_input)

# Initialize OpenAI client
my_key = open('key_to_gpt.txt', 'r').readline().strip()
client = OpenAI(api_key=my_key)


class TeeStream:
    """Stream wrapper that writes to both file and stdout."""
    def __init__(self, filename):
        self.file = open(filename, 'a')
        self.stdout = sys.stdout

    def write(self, data):
        self.file.write(data)
        self.stdout.write(data)
        self.file.flush()
        self.stdout.flush()

    def flush(self):
        try:
            self.file.flush()
            self.stdout.flush()
        except ValueError:
            pass

    def close(self):
        self.file.close()


def update_chat_display(content, user_id):
    """Update the chat transcript file that the frontend watches"""
    session_id = db.get_session_id_for_user(user_id)
    chat_history = db.get_chat_history(session_id)

    # chat_history is already a list of messages
    # Wrap it for the frontend
    with open(f'ux/userdata/chatTranscript_{user_id}.json', 'w') as file:
        json.dump({"messages": chat_history + [{"role": "Negotiation Coach", "content": content}]}, file)


def main():
    # Skip if no input
    if user_input == "":
        return

    # Set up logging
    tee = TeeStream(f"./logs/logs_{user_id}.log")
    sys.stdout = tee

    print("\n\n" + "="*60)
    print("NEW CHAT MESSAGE")
    print("="*60 + "\n")

    try:
        # Get session and update chat history with user input
        session_id = db.get_session_id_for_user(user_id)
        user_name = db.get_user_name(user_id)

        print(f"Session ID: {session_id}")
        print(f"User name: {user_name}")

        # Add user message to chat history
        db.update_chat_history(session_id, {"role": user_name, "content": user_input})

        # Update the display with user input
        chat_history = db.get_chat_history(session_id)
        with open(f'ux/userdata/chatTranscript_{user_id}.json', 'w') as file:
            json.dump({"messages": chat_history}, file)

        print("User message added to chat history")

        # Load planning doc data
        planning_doc_data = db.load_planning_doc_data(user_id)
        print(f"Planning doc loaded: {json.dumps(planning_doc_data, indent=2)}")

        # Load the simple prompt
        with open("prompts/simple_class_prompt.txt", 'r') as file:
            prompt_template = file.read()

        # Replace placeholders (chat_history is already a list)
        prompt = prompt_template.replace(
            "{insert_planning_doc}",
            json.dumps(planning_doc_data, indent=2)
        ).replace(
            "{insert_conversation_history}",
            json.dumps(chat_history, indent=2)
        )

        print("Prompt prepared, calling GPT...")

        # Show thinking indicator
        update_chat_display("<THINKING/>", user_id)

        # Call GPT with streaming
        messages = [
            {"role": "system", "content": prompt},
            {"role": "user", "content": user_input}
        ]

        stream = client.chat.completions.create(
            model="gpt-5-nano-2025-08-07",
            messages=messages,
            stream=True,
        )

        # Stream the response
        full_response = ""
        for chunk in stream:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content

                # Update display with accumulated response
                update_chat_display(full_response, user_id)

        print(f"\nGPT Response: {full_response}")

        # Save final response to database
        db.update_chat_history(session_id, {"role": "Negotiation Coach", "content": full_response})

        print("Response saved to database")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        tee.close()


if __name__ == "__main__":
    main()
