import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get directory path in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

async function seedDrivers() {
  const driversToInsert = [
    {
      name: 'Shanaya Vala',
      license_number: 'MH982006391837',
      contact_number: '9301792286',
      email: 'psastry@gmail.com',
      join_date: '2023-12-09',
      experience_years: 27,
      status: 'active',
      license_expiry_date: '2027-09-25',
      license_doc_url: null
    },
    {
      name: 'Ira Chada',
      license_number: 'TN702018535862',
      contact_number: '9289365978',
      email: 'bathsamarth@yohannan-bhakta.info',
      join_date: '2021-08-01',
      experience_years: 1,
      status: 'active',
      license_expiry_date: '2028-01-16',
      license_doc_url: null
    },
    {
      name: 'Vidur Dave',
      license_number: 'UP102006852981',
      contact_number: '9759858257',
      email: 'kiaan40@arora.com',
      join_date: '2021-08-22',
      experience_years: 19,
      status: 'inactive',
      license_expiry_date: '2025-08-03',
      license_doc_url: null
    },
    {
      name: 'Rohan Goda',
      license_number: 'MP492012276550',
      contact_number: '9694065440',
      email: 'mkaur@dugar-chaudhary.net',
      join_date: '2024-10-03',
      experience_years: 6,
      status: 'inactive',
      license_expiry_date: '2027-02-09',
      license_doc_url: null
    },
    {
      name: 'Priya Sharma',
      license_number: 'DL012015001234',
      contact_number: '9876512345',
      email: 'priya.sharma@example.com',
      join_date: '2020-01-15',
      experience_years: 8,
      status: 'active',
      license_expiry_date: '2029-03-10',
      license_doc_url: null
    },
    {
      name: 'Amit Kumar',
      license_number: 'RJ142019005678',
      contact_number: '9988765432',
      email: 'amit.kumar@example.com',
      join_date: '2019-07-20',
      experience_years: 5,
      status: 'active',
      license_expiry_date: '2026-11-22',
      license_doc_url: null
    },
    {
      name: 'Deepa Singh',
      license_number: 'HR262017009876',
      contact_number: '9712345678',
      email: 'deepa.singh@example.com',
      join_date: '2021-03-01',
      experience_years: 3,
      status: 'inactive',
      license_expiry_date: '2025-05-18',
      license_doc_url: null
    },
    {
      name: 'Rahul Verma',
      license_number: 'PB022021003456',
      contact_number: '9654321098',
      email: 'rahul.verma@example.com',
      join_date: '2022-09-10',
      experience_years: 2,
      status: 'active',
      license_expiry_date: '2027-08-05',
      license_doc_url: null
    },
    {
      name: 'Sonia Devi',
      license_number: 'KA012016007890',
      contact_number: '9543210987',
      email: 'sonia.devi@example.com',
      join_date: '2018-05-25',
      experience_years: 6,
      status: 'active',
      license_expiry_date: '2028-02-14',
      license_doc_url: null
    },
    {
      name: 'Arjun Reddy',
      license_number: 'TS092014001122',
      contact_number: '9432109876',
      email: 'arjun.reddy@example.com',
      join_date: '2017-11-11',
      experience_years: 7,
      status: 'active',
      license_expiry_date: '2026-09-30',
      license_doc_url: null
    },
    {
      name: 'Pooja Gupta',
      license_number: 'GJ062022004567',
      contact_number: '9321098765',
      email: 'pooja.gupta@example.com',
      join_date: '2023-02-01',
      experience_years: 1,
      status: 'inactive',
      license_expiry_date: '2025-10-01',
      license_doc_url: null
    },
    {
      name: 'Vikas Yadav',
      license_number: 'UP162018008901',
      contact_number: '9210987654',
      email: 'vikas.yadav@example.com',
      join_date: '2019-09-01',
      experience_years: 4,
      status: 'active',
      license_expiry_date: '2027-04-20',
      license_doc_url: null
    },
    {
      name: 'Anjali Sharma',
      license_number: 'MP042020002345',
      contact_number: '9109876543',
      email: 'anjali.sharma@example.com',
      join_date: '2022-01-01',
      experience_years: 2,
      status: 'active',
      license_expiry_date: '2028-07-15',
      license_doc_url: null
    },
    {
      name: 'Gaurav Singh',
      license_number: 'BR012017006789',
      contact_number: '9098765432',
      email: 'gaurav.singh@example.com',
      join_date: '2018-08-08',
      experience_years: 5,
      status: 'active',
      license_expiry_date: '2026-06-01',
      license_doc_url: null
    },
    {
      name: 'Kavita Rao',
      license_number: 'MH042015001122',
      contact_number: '8987654321',
      email: 'kavita.rao@example.com',
      join_date: '2017-03-10',
      experience_years: 7,
      status: 'active',
      license_expiry_date: '2029-01-20',
      license_doc_url: null
    },
    {
      name: 'Suresh Kumar',
      license_number: 'TN072019005566',
      contact_number: '8876543210',
      email: 'suresh.kumar@example.com',
      join_date: '2020-11-05',
      experience_years: 3,
      status: 'inactive',
      license_expiry_date: '2025-12-31',
      license_doc_url: null
    },
    {
      name: 'Meena Patel',
      license_number: 'GJ012021009988',
      contact_number: '8765432109',
      email: 'meena.patel@example.com',
      join_date: '2023-06-15',
      experience_years: 1,
      status: 'active',
      license_expiry_date: '2028-04-10',
      license_doc_url: null
    },
    {
      name: 'Rajesh Sharma',
      license_number: 'DL052016007788',
      contact_number: '8654321098',
      email: 'rajesh.sharma@example.com',
      join_date: '2018-02-20',
      experience_years: 6,
      status: 'active',
      license_expiry_date: '2027-07-25',
      license_doc_url: null
    },
    {
      name: 'Pooja Devi',
      license_number: 'HR512022001234',
      contact_number: '8543210987',
      email: 'pooja.devi@example.com',
      join_date: '2023-09-01',
      experience_years: 0,
      status: 'active',
      license_expiry_date: '2029-05-01',
      license_doc_url: null
    },
    {
      name: 'Manoj Kumar',
      license_number: 'RJ272017005678',
      contact_number: '8432109876',
      email: 'manoj.kumar@example.com',
      join_date: '2019-04-10',
      experience_years: 5,
      status: 'active',
      license_expiry_date: '2026-03-20',
      license_doc_url: null
    }
  ]

  const { data, error } = await supabase
    .from('drivers')
    .insert(driversToInsert)

  if (error) {
    console.error('❌ Failed to insert drivers:', error)
  } else {
    console.log('✅ Drivers inserted successfully:', data)
  }
}

seedDrivers()