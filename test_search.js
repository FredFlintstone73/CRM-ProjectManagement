// Simple test for search functionality
import fetch from 'node-fetch';

async function testSearch() {
  try {
    console.log('Testing basic contacts API...');
    
    const response = await fetch('http://localhost:5000/api/contacts', {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const contacts = await response.json();
      console.log(`Found ${contacts.length} total contacts`);
      
      // Look for Ted Smith in spouse info
      const tedSmith = contacts.find(c => 
        c.spouse_first_name?.toLowerCase().includes('ted') ||
        c.spouse_last_name?.toLowerCase().includes('smith')
      );
      
      if (tedSmith) {
        console.log('Found Ted Smith:', {
          id: tedSmith.id,
          firstName: tedSmith.first_name,
          lastName: tedSmith.last_name,
          spouseFirstName: tedSmith.spouse_first_name,
          spouseLastName: tedSmith.spouse_last_name
        });
      } else {
        console.log('Ted Smith not found in spouse information');
      }
    } else {
      console.log('Failed to fetch contacts:', response.status);
    }
    
  } catch (error) {
    console.error('Test error:', error.message);
  }
}

testSearch();