export const DEFAULT_MONITORED_ACCOUNTS: string[] = [
  'pranaviism.tech',
  'job_hiring_hub',
  'jobzonecareer',
  'karrar_hussain_jobs',
  'lets.get.you.hired',
  '_nexgenhiring',
  'job_updates9648',
  'ribhu_susmita',
  'theektabaddie',
  'the.campus.official',
  'vivekkcreates',
  'shailjamishra__',
  'postloginthoughts',
  'techtalksbynavneet',
  'code.with.hrithik',
  'cheetahmodeon',
  'cma.tanishaaa',
  'myragoswami',
  'kp._toys',
  'gauravgupta7431',
  'dr_dadarwal',
  'padho_with_pratyush',
  'aajay.ai',
  'techie.rimo',
  'ayulivingherdream',
  'krishna_jsw',
  'amit.goes.remote',
  'finnomicswithmanisha',
  'coders.world',
  'debugwithshubham',
  'fastjob.in',
  'dr_tech_786',
  'anannyas_',
  'rituprajapatiii_',
  'xee_krishna',
  'from5to20lpa',
  'ssvlogsofficial',
  'growth_sourabh',
  'rahux.ai',
  'snnubbo',
  'hustle.with.naman',
  'hiten.codes',
  'rxyii.05',
  'rithik_codez',
  'careerwithdarpan',
  'vipin.verma._',
  'jai.oslo',
  'upscworldofficial',
  'nchuure',
  'nz.for.genz',
  'collegebuddyofficial',
  'indianbuzz.in',
  'cinovixa07',
  'fin_saheli',
  'heat.portraits',
  'bits.ofakshat',
  'heavenlife_007',
  'hr_lakshay04',
  'tg_navedul_editor',
  'techbites.co',
  'sanju_vlog1',
  'raul_the_rockstar',
  'saaadrashid',
  'ags.consultants',
  'pritkargathiya.ai',
  'tech_jobs_india',
  'careerwithkumar',
  'ca.nikitasimplifies',
  '._scholarly_insights._'
];

/**
 * Single source of truth for monitored Instagram accounts.
 * Reads MONITORED_INSTAGRAM_ACCOUNTS env var if provided (comma-separated list),
 * otherwise defaults to the 69 configured accounts above.
 */
export function getMonitoredInstagramAccounts(): string[] {
  const envAccounts = process.env.MONITORED_INSTAGRAM_ACCOUNTS;
  if (envAccounts && envAccounts.trim() !== '') {
    const parsed = envAccounts
      .split(',')
      .map(a => a.trim().replace(/^@/, ''))
      .filter(a => a.length > 0);
    if (parsed.length > 0) {
      return parsed;
    }
  }
  return DEFAULT_MONITORED_ACCOUNTS;
}
