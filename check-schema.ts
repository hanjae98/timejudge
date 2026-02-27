import { createClient } from './src/lib/supabase/server';

async function checkSchema() {
    const supabase = await createClient();

    console.log('--- tasks columns ---');
    const { data: tasksData, error: tasksError } = await supabase.from('tasks').select('*').limit(1);
    if (tasksError) console.error(tasksError);
    else if (tasksData && tasksData.length > 0) console.log(Object.keys(tasksData[0]));
    else console.log('No data in tasks');

    console.log('--- time_blocks columns ---');
    const { data: blocksData, error: blocksError } = await supabase.from('time_blocks').select('*').limit(1);
    if (blocksError) console.error(blocksError);
    else if (blocksData && blocksData.length > 0) console.log(Object.keys(blocksData[0]));
    else console.log('No data in time_blocks');
}

checkSchema();
