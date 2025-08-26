// Test user signup and profile creation
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key);

async function main() {
  console.log('Testing user signup and profile creation...');
  
  const testEmail = 'test@sparqconnection.com';
  const testPassword = 'testpass123';
  const testName = 'Test User';
  
  try {
    // First, clean up any existing test user
    console.log('Cleaning up existing test user...');
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(testEmail);
    if (existingUser.user) {
      await supabase.auth.admin.deleteUser(existingUser.user.id);
      console.log('Existing test user deleted');
    }
    
    // Create a new user
    console.log('Creating new test user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      user_metadata: {
        full_name: testName
      }
    });
    
    if (authError) {
      console.error('Auth error:', authError.message);
      return;
    }
    
    console.log('✓ User created:', authData.user.id);
    
    // Check if profile was created via trigger
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
      
    if (profileError) {
      console.error('Profile check error:', profileError.message);
      return;
    }
    
    console.log('✓ Profile created via trigger:', {
      user_id: profile.user_id,
      email: profile.email,
      full_name: profile.full_name
    });
    
    // Test the login API endpoint by trying to sign in
    console.log('Testing sign in...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('Sign in error:', signInError.message);
      return;
    }
    
    console.log('✓ Sign in successful:', signInData.user.id);
    
    // Clean up
    await supabase.auth.admin.deleteUser(authData.user.id);
    console.log('✓ Test user cleaned up');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});