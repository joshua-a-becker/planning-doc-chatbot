import React, { useState } from 'react';
import { Send } from 'lucide-react';

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: '20px',
  },
  formCard: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '32px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '24px',
    textAlign: 'center',
  },
  inputGroup: {
    display: 'flex',
    marginBottom: '16px',
  },
  input: {
    flex: '1',
    padding: '10px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px 0 0 4px',
    fontSize: '14px',
    '&:focus': {
      outline: 'none',
      borderColor: '#3498db',
    },
  },
  button: {
    padding: '10px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '0 4px 4px 0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      backgroundColor: '#2980b9',
    },
  },
};

const NewUserForm = () => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim()) {
      // Replace whitespace with underscores and remove any other special characters
      const formattedUsername = username.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      window.location.href = `${window.location.pathname}?userId=${encodeURIComponent(formattedUsername)}`;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h1 style={styles.title}>Welcome to your online negotiation coach!</h1>
        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter username"
              required
            />
            <button type="submit" style={styles.button}>
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewUserForm;