const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function testDirectSearch() {
  try {
    console.log('Testing direct database search...');
    
    const result = await sql`
      SELECT id, first_name, last_name, spouse_first_name, spouse_last_name 
      FROM contacts 
      WHERE spouse_first_name ILIKE '%ted%' 
         OR spouse_last_name ILIKE '%smith%'
         OR first_name ILIKE '%ted%'
         OR last_name ILIKE '%smith%'
      LIMIT 5
    `;
    
    console.log('Direct database results:', result);
    
  } catch (error) {
    console.error('Direct database test error:', error);
  }
}

testDirectSearch();