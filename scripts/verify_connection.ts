
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function verifyConnection() {
    try {
        // Read .env file manually
        const envPath = path.resolve(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) {
            console.error('❌ .env file not found');
            process.exit(1);
        }

        const envContent = fs.readFileSync(envPath, 'utf-8');
        const env: Record<string, string> = {};

        console.log('Raw .env content length:', envContent.length);

        envContent.split(/\r?\n/).forEach(line => {
            line = line.trim();
            if (!line || line.startsWith('#')) return;

            const equalIndex = line.indexOf('=');
            if (equalIndex > 0) {
                const key = line.slice(0, equalIndex).trim();
                let value = line.slice(equalIndex + 1).trim();

                // Remove quotes if present
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[key] = value;
            }
        });

        const supabaseUrl = env['VITE_SUPABASE_URL'];
        const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
            console.log('Parsed env:', env);
            process.exit(1);
        }

        if (supabaseUrl.includes('your_project_id')) {
            console.error('❌ VITE_SUPABASE_URL still contains placeholder "your_project_id"');
            process.exit(1);
        }

        console.log(`Checking connection to: ${supabaseUrl}`);
        console.log(`Key length: ${supabaseKey.length}`);

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Attempt a request. Even a 401 is a success for connectivity (DNS/Network is fine).
        // The original error was net::ERR_NAME_NOT_RESOLVED which throws an exception here.
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (error) {
            // If it's a network error, message usually mentions fetch failed
            if (error.message.includes('fetch') || error.message.includes('network')) {
                console.error('❌ Connection Failed:', error.message);
                console.error('Full Error:', error);
            } else {
                console.log('✅ Connection Sucessful! (Got database response, even if 401/403/404)');
                console.log('Database Error (Expected due to RLS):', error.message);
            }
        } else {
            console.log('✅ Connection Sucessful! (Query executed)');
        }

    } catch (err: any) {
        console.error('❌ Unexpected Error:', err.message);
        if (err.cause) console.error('Cause:', err.cause);
    }
}

verifyConnection();
