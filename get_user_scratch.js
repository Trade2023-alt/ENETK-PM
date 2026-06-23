const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
    const newHash = bcrypt.hashSync('testpassword', 10);
    const { data, error } = await supabase
        .from('users')
        .update({ password_hash: newHash })
        .eq('username', 'KyleMerrill')
        .select();
    
    if (error) {
        console.error("Error updating user password:", error);
    } else {
        console.log("Updated user:", data);
    }
}

run();
