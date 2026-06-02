import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgylxvlyomclwxodrnqs.supabase.co'
const supabaseKey = 'sb_publishable_T-5nDTWJQlAwjMZGRDgaoA_8sPmW3Sm'

export const supabase = createClient(supabaseUrl, supabaseKey)