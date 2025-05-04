export const sendMessageToWebhook = async (message: string): Promise<string> => {
  try {
    console.log('Sending message to webhook:', message);
    
    const response = await fetch('https://n8n.aidoption.fr/webhook/Artips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      console.error('HTTP error status:', response.status);
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Get the response as text first
    const textData = await response.text();
    console.log('Raw webhook response:', textData);
    
    // If the response is empty, return a default message
    if (!textData || textData.trim() === '') {
      console.warn('Empty response received from webhook');
      return 'Sorry, I received an empty response. Please try again.';
    }
    
    // Extract and format the response text
    return formatResponseText(textData);
  } catch (error) {
    console.error('Error sending message to webhook:', error);
    throw error;
  }
};

// Function to format the response text
export const formatResponseText = (text: string): string => {
  // Try to parse as JSON if it looks like JSON
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      const data = JSON.parse(text);
      
      // Handle different possible response formats
      if (typeof data === 'string') {
        return cleanHtmlAndFormatText(data);
      } else if (data && typeof data.output === 'string') {
        return cleanHtmlAndFormatText(data.output);
      } else if (data && typeof data.response === 'string') {
        return cleanHtmlAndFormatText(data.response);
      } else if (data && typeof data.message === 'string') {
        return cleanHtmlAndFormatText(data.message);
      } else if (data && typeof data.text === 'string') {
        return cleanHtmlAndFormatText(data.text);
      } else if (data && typeof data.content === 'string') {
        return cleanHtmlAndFormatText(data.content);
      } else if (data && typeof data.result === 'string') {
        return cleanHtmlAndFormatText(data.result);
      } else if (data && typeof data.answer === 'string') {
        return cleanHtmlAndFormatText(data.answer);
      } else if (data && typeof data.data === 'string') {
        return cleanHtmlAndFormatText(data.data);
      } else if (data && data.data && typeof data.data.response === 'string') {
        return cleanHtmlAndFormatText(data.data.response);
      } else if (data && data.data && typeof data.data.message === 'string') {
        return cleanHtmlAndFormatText(data.data.message);
      } else if (data && data.data && typeof data.data.text === 'string') {
        return cleanHtmlAndFormatText(data.data.text);
      } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
        return cleanHtmlAndFormatText(data[0]);
      } else if (data && typeof data === 'object') {
        // Try to find any string property that might contain the response
        for (const key in data) {
          if (typeof data[key] === 'string' && data[key].length > 20) {
            return cleanHtmlAndFormatText(data[key]);
          }
        }
        
        // If we can't find a suitable property, stringify the object
        return 'Response: ' + cleanHtmlAndFormatText(JSON.stringify(data));
      }
    } catch (e) {
      console.error('JSON parsing error:', e);
      // If JSON parsing fails, try to clean the text directly
      return cleanHtmlAndFormatText(text);
    }
  }
  
  // Not JSON, clean and format as plain text
  return cleanHtmlAndFormatText(text);
};

// Function to clean HTML and format text
export const cleanHtmlAndFormatText = (text: string): string => {
  // First, check if the text contains "Response:" prefix and remove it
  if (text.startsWith('Response:')) {
    text = text.substring('Response:'.length).trim();
  }
  
  // Try to extract content from JSON if it's still in JSON format
  if (text.trim().startsWith('{') && text.includes('"output"')) {
    try {
      const match = text.match(/"output"\s*:\s*"([^"]*)"/);
      if (match && match[1]) {
        text = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
    } catch (e) {
      console.error('Error extracting from JSON string:', e);
    }
  }
  
  // Replace escaped newlines with actual newlines
  text = text.replace(/\\n/g, '\n');
  
  // Replace escaped quotes with actual quotes
  text = text.replace(/\\"/g, '"');
  
  // Remove HTML tags but preserve line breaks and formatting
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li>/gi, '\n• ')
    .replace(/<\/li>/gi, '')
    .replace(/<ul>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<h[1-6]>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<strong>|<b>/gi, '')
    .replace(/<\/strong>|<\/b>/gi, '')
    .replace(/<em>|<i>/gi, '')
    .replace(/<\/em>|<\/i>/gi, '')
    .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
  
  // Replace markdown bold/italic with plain text
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/_(.*?)_/g, '$1');
  
  // Replace markdown links with just the text
  text = text.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  
  // Replace multiple consecutive newlines with just two
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  text = text.trim();
  
  return text;
};
