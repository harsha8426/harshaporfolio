'use strict';

/**
 * Test-only source-of-truth fixtures for portfolio-resume-details-update.
 *
 * This module is intentionally isolated under tests/. Production pages and
 * scripts must not import it or render it at runtime.
 */

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(value[key]);
  }

  return Object.freeze(value);
}

const identity = {
  fullName: 'Niddana Harsha Vardhan',
  location: 'Visakhapatnam'
};

const contact = {
  emailDisplay: 'niddanaharshavardhan@gmail.com',
  emailHref: 'mailto:niddanaharshavardhan@gmail.com',
  phoneDisplay: '+91 9490312456',
  phoneHref: 'tel:+919490312456',
  linkedInHandle: '@harsha1919',
  linkedInUrl: null,
  githubUrl: null
};

const profile = {
  role: 'QA Automation Engineer/SDET',
  totalExperience: '5+ years of total IT experience',
  qaExperience: '4+ years of software QA experience'
};

const allowedRoleLabels = [
  'QA Automation Engineer/SDET',
  'Senior Quality Assurance Analyst'
];

const skillGroupDefinitions = {
  automation: {
    sourceRef: 'Requirements 4.1',
    values: [
      'Playwright',
      'TypeScript',
      'JavaScript',
      'Node.js',
      'npm',
      'Page Object Model (POM)',
      'data-driven testing',
      'Playwright APIRequestContext'
    ]
  },
  qualityAssurance: {
    sourceRef: 'Requirements 4.2',
    values: [
      'functional testing',
      'smoke testing',
      'regression testing',
      'integration testing',
      'system testing',
      'negative testing',
      'boundary testing',
      'data validation',
      'schema validation'
    ]
  },
  dataAndEtl: {
    sourceRef: 'Requirements 4.3',
    values: [
      'Apache Hop',
      'Infor Data Fabric ETL Tool',
      'Data Lake',
      'Compass',
      'PostgreSQL',
      'SQL',
      'DB2',
      'DB2/400',
      'Oracle',
      'source-to-target validation'
    ]
  },
  executionDeliveryReporting: {
    sourceRef: 'Requirements 4.4',
    values: [
      'GitLab CI/CD',
      'Playwright sharding',
      'Chromium',
      'blob reports',
      'HTML reports',
      'JUnit reports',
      'AWS S3'
    ]
  },
  toolsAndPlatforms: {
    sourceRef: 'Requirements 4.5',
    values: [
      'Jira',
      'Zephyr Scale',
      'Infor OS',
      'Data Fabric',
      'Data Catalog',
      'Enterprise Graph',
      'IEG',
      'Mingle',
      'ION API Gateway'
    ]
  },
  formatsAndMetadata: {
    sourceRef: 'Requirements 4.6',
    values: [
      'JSON',
      'NDJSON',
      'XML',
      'XSD',
      'CSV',
      'DSV',
      'ZIP',
      'schema metadata',
      'encoding validation'
    ]
  }
};

const skillGroups = Object.fromEntries(
  Object.entries(skillGroupDefinitions).map(([group, definition]) => [
    group,
    [...definition.values]
  ])
);

const forbiddenClaimPatterns = [
  {
    id: 'unsupported-six-plus-years',
    description: 'Unsupported 6+ years experience claim',
    pattern: /\b6\s*\+\s*years?\b/i,
    sourceRef: 'Requirements 3.4'
  },
  {
    id: 'unsupported-project-count',
    description: 'Unsupported 50+ projects claim',
    pattern: /\b50\s*\+\s*projects?\b/i,
    sourceRef: 'Requirements 3.5'
  },
  {
    id: 'unsupported-ai-claim',
    description: 'Unsupported artificial-intelligence expertise or testing claim',
    pattern: /\b(?:artificial[-\s]+intelligence(?:[-\s]+(?:powered|driven))?[-\s]+(?:testing|expertise)|AI[-\s]+(?:powered|driven)[-\s]+testing|AI[-\s]+expert(?:ise)?)\b/i,
    sourceRef: 'Requirements 3.6'
  },
  {
    id: 'unsupported-mcp-claim',
    description: 'Unsupported Model Context Protocol claim',
    pattern: /\b(?:Model\s+Context\s+Protocol|MCP)\b/i,
    sourceRef: 'Requirements 3.7'
  },
  {
    id: 'unsupported-steering-file-claim',
    description: 'Unsupported steering-file creation claim',
    pattern: /\bsteering[-\s]+files?\b/i,
    sourceRef: 'Requirements 3.8'
  },
  {
    id: 'unsupported-prompt-engineering-claim',
    description: 'Unsupported prompt-engineering claim',
    pattern: /\bprompt[-\s]+engineering\b/i,
    sourceRef: 'Requirements 3.8'
  },
  {
    id: 'unsupported-ai-test-generation-claim',
    description: 'Unsupported artificial-intelligence test-generation claim',
    pattern: /\b(?:(?:AI|artificial[-\s]+intelligence)[-\s]+(?:powered[-\s]+)?test[-\s]+generation|AI[-\s]+generated[-\s]+tests?)\b/i,
    sourceRef: 'Requirements 3.8'
  },
  {
    id: 'unsupported-availability-status',
    description: 'Unsupported personal availability status',
    pattern: /\b(?:(?:currently\s+)?available\s+for\s+(?:work|hire|opportunities)|open\s+to\s+work)\b/i,
    sourceRef: 'Requirements 3.10'
  },
  {
    id: 'unsupported-proficiency-percentage',
    description: 'Unsupported skill or proficiency percentage',
    pattern: /(?:\b\d{1,3}\s*%|data-width\s*=\s*["']\d{1,3}["'])/i,
    sourceRef: 'Requirements 3.10'
  },
  {
    id: 'unsupported-leadership-claim',
    description: 'Unsupported personal leadership claim',
    pattern: /\b(?:leadership|team\s+lead|technical\s+lead|project\s+lead)\b/i,
    sourceRef: 'Requirements 5.14'
  },
  {
    id: 'stale-hcl-title',
    description: 'Unsupported SCCM Administrator title',
    pattern: /\bSCCM\s+Administrator\b/i,
    sourceRef: 'Requirements 6.6'
  },
  {
    id: 'unsupported-intermediate-education',
    description: 'Unsupported Intermediate, MPC education record',
    pattern: /\bIntermediate\s*,?\s*MPC\b/i,
    sourceRef: 'Requirements 7.7'
  },
  {
    id: 'unsupported-ssc-education',
    description: 'Unsupported S.S.C education record',
    pattern: /\bS\.?\s*S\.?\s*C\.?\b/i,
    sourceRef: 'Requirements 7.7'
  },
  {
    id: 'unsupported-test-lab-qa-lead',
    description: 'Unsupported QA Lead title for Harsha in Test Lab',
    pattern: /\bQA\s+Lead\b/i,
    sourceRef: 'Requirements 8.5'
  }
];

const employment = [
  {
    id: 'infor-current',
    current: true,
    title: 'Senior Quality Assurance Analyst',
    employer: 'Infor India Pvt. Ltd.',
    location: 'Hyderabad',
    period: 'November 2021–Present',
    sourceRefs: {
      current: 'Requirements 5.1',
      title: 'Requirements 5.2',
      employer: 'Requirements 5.3',
      location: 'Requirements 5.4',
      period: 'Requirements 5.5'
    }
  },
  {
    id: 'hcl-prior',
    current: false,
    title: 'Associate—SCM Administration',
    employer: 'HCL Technologies',
    location: 'Chennai',
    period: 'December 2020–November 2021',
    sourceRefs: {
      title: 'Requirements 6.1',
      employer: 'Requirements 6.2',
      location: 'Requirements 6.3',
      period: 'Requirements 6.4'
    }
  }
];

const employerResponsibilities = {
  'Infor India Pvt. Ltd.': [
    {
      id: 'playwright-automation',
      responsibility: 'Playwright automation',
      details: [
        'Playwright',
        'TypeScript',
        'JavaScript',
        'Node.js',
        'npm',
        'Page Object Model (POM)',
        'data-driven testing',
        'Playwright APIRequestContext'
      ],
      sourceRef: 'Requirements 5.6'
    },
    {
      id: 'qa-validation-coverage',
      responsibility: 'QA validation coverage',
      details: [
        'functional testing',
        'smoke testing',
        'regression testing',
        'integration testing',
        'system testing',
        'negative testing',
        'boundary testing',
        'data validation',
        'schema validation'
      ],
      sourceRef: 'Requirements 5.7'
    },
    {
      id: 'etl-and-source-to-target-validation',
      responsibility: 'ETL and source-to-target validation',
      details: [
        'Apache Hop',
        'Infor Data Fabric ETL Tool',
        'Data Lake',
        'Compass',
        'PostgreSQL',
        'SQL',
        'DB2',
        'DB2/400',
        'Oracle',
        'source-to-target validation'
      ],
      sourceRef: 'Requirements 5.8'
    },
    {
      id: 'gitlab-execution-and-reporting',
      responsibility: 'GitLab CI/CD execution and reporting',
      details: [
        'GitLab CI/CD',
        'Playwright sharding',
        'Chromium',
        'blob reports',
        'HTML reports',
        'JUnit reports',
        'AWS S3'
      ],
      sourceRef: 'Requirements 5.9'
    },
    {
      id: 'test-management-and-infor-platforms',
      responsibility: 'Test management and Infor platform validation',
      details: [
        'Jira',
        'Zephyr Scale',
        'Infor OS',
        'Data Fabric',
        'Mingle',
        'ION API Gateway'
      ],
      sourceRef: 'Requirements 5.10'
    },
    {
      id: 'data-catalog-workflow-validation',
      responsibility: 'Data Catalog workflow validation',
      details: ['Data Catalog'],
      sourceRef: 'Requirements 5.10'
    },
    {
      id: 'enterprise-graph-validation',
      responsibility: 'Enterprise Graph and IEG graph validation',
      details: ['Enterprise Graph', 'IEG'],
      sourceRef: 'Requirements 5.10'
    },
    {
      id: 'format-metadata-and-encoding-validation',
      responsibility: 'Data format, schema metadata, and encoding validation',
      details: [
        'JSON',
        'NDJSON',
        'XML',
        'XSD',
        'CSV',
        'DSV',
        'ZIP',
        'schema metadata',
        'encoding validation'
      ],
      sourceRef: 'Requirements 5.11'
    }
  ],
  'HCL Technologies': [
    {
      id: 'application-package-deployment',
      responsibility: 'application package deployment',
      details: [],
      sourceRef: 'Requirements 6.5'
    },
    {
      id: 'windows-update-and-patching-support',
      responsibility: 'Windows update/patching support',
      details: [],
      sourceRef: 'Requirements 6.5'
    },
    {
      id: 'active-directory-and-servicenow-operations',
      responsibility: 'Active Directory and ServiceNow operational tasks',
      details: [],
      sourceRef: 'Requirements 6.5'
    },
    {
      id: 'vulnerability-management-support',
      responsibility: 'vulnerability-management support',
      details: [],
      sourceRef: 'Requirements 6.5'
    },
    {
      id: 'deployment-and-system-issue-investigation',
      responsibility: 'deployment/system issue investigation',
      details: [],
      sourceRef: 'Requirements 6.5'
    },
    {
      id: 'support-team-coordination',
      responsibility: 'coordination with support teams',
      details: [],
      sourceRef: 'Requirements 6.5'
    }
  ]
};

const education = [
  {
    qualification: 'B.Tech EEE',
    institution: "Vignan's Institute of Information Technology",
    period: '01/2016–12/2020',
    resultLabel: 'CGPA',
    result: '7.8',
    sourceRefs: {
      qualification: 'Requirements 7.2',
      institution: 'Requirements 7.3',
      period: 'Requirements 7.4',
      resultLabel: 'Requirements 7.5',
      result: 'Requirements 7.5'
    }
  }
];

const canonicalValueSourceRefs = {
  'identity.fullName': 'Requirements 2.1',
  'identity.location': 'Requirements 2.2',
  'contact.emailDisplay': 'Requirements 2.3',
  'contact.emailHref': 'Requirements 2.4',
  'contact.phoneDisplay': 'Requirements 2.5',
  'contact.phoneHref': 'Requirements 2.6',
  'contact.linkedInHandle': 'Requirements 2.7',
  'contact.linkedInUrl': 'Requirements 2.8',
  'contact.githubUrl': 'Requirements 2.9',
  'profile.role': 'Requirements 3.1',
  'profile.totalExperience': 'Requirements 3.2',
  'profile.qaExperience': 'Requirements 3.3',
  'employment.infor-current.current': 'Requirements 5.1',
  'employment.infor-current.title': 'Requirements 5.2',
  'employment.infor-current.employer': 'Requirements 5.3',
  'employment.infor-current.location': 'Requirements 5.4',
  'employment.infor-current.period': 'Requirements 5.5',
  'employment.hcl-prior.title': 'Requirements 6.1',
  'employment.hcl-prior.employer': 'Requirements 6.2',
  'employment.hcl-prior.location': 'Requirements 6.3',
  'employment.hcl-prior.period': 'Requirements 6.4',
  'education.0.qualification': 'Requirements 7.2',
  'education.0.institution': 'Requirements 7.3',
  'education.0.period': 'Requirements 7.4',
  'education.0.resultLabel': 'Requirements 7.5',
  'education.0.result': 'Requirements 7.5'
};

const sourceRefs = {
  canonicalValues: canonicalValueSourceRefs,
  allowedRoleLabels: {
    'QA Automation Engineer/SDET': 'Requirements 3.1',
    'Senior Quality Assurance Analyst': 'Requirements 5.2'
  },
  skillGroups: Object.fromEntries(
    Object.entries(skillGroupDefinitions).map(([group, definition]) => [
      group,
      Object.fromEntries(
        definition.values.map((skill) => [skill, definition.sourceRef])
      )
    ])
  ),
  forbiddenClaimPatterns: Object.fromEntries(
    forbiddenClaimPatterns.map(({ id, sourceRef }) => [id, sourceRef])
  ),
  employerResponsibilities: Object.fromEntries(
    Object.entries(employerResponsibilities).map(([employer, responsibilities]) => [
      employer,
      Object.fromEntries(
        responsibilities.map((responsibility) => [
          responsibility.id,
          {
            responsibility: responsibility.sourceRef,
            details: Object.fromEntries(
              responsibility.details.map((detail) => [
                detail,
                responsibility.sourceRef
              ])
            )
          }
        ])
      )
    ])
  )
};

const canonicalValues = {
  ...identity,
  ...contact,
  ...profile,
  inforTitle: employment[0].title,
  inforEmployer: employment[0].employer,
  inforLocation: employment[0].location,
  inforPeriod: employment[0].period,
  hclTitle: employment[1].title,
  hclEmployer: employment[1].employer,
  hclLocation: employment[1].location,
  hclPeriod: employment[1].period,
  educationQualification: education[0].qualification,
  educationInstitution: education[0].institution,
  educationPeriod: education[0].period,
  educationResultLabel: education[0].resultLabel,
  educationResult: education[0].result
};

const canonicalFieldFixtures = [
  ['identity.fullName', identity.fullName, null],
  ['identity.location', identity.location, null],
  ['contact.emailDisplay', contact.emailDisplay, null],
  ['contact.emailHref', contact.emailHref, null],
  ['contact.phoneDisplay', contact.phoneDisplay, null],
  ['contact.phoneHref', contact.phoneHref, null],
  ['contact.linkedInHandle', contact.linkedInHandle, null],
  ['profile.role', profile.role, null],
  ['profile.totalExperience', profile.totalExperience, null],
  ['profile.qaExperience', profile.qaExperience, null],
  ['employment.infor-current.current', employment[0].current, employment[0].employer],
  ['employment.infor-current.title', employment[0].title, employment[0].employer],
  ['employment.infor-current.employer', employment[0].employer, employment[0].employer],
  ['employment.infor-current.location', employment[0].location, employment[0].employer],
  ['employment.infor-current.period', employment[0].period, employment[0].employer],
  ['employment.hcl-prior.title', employment[1].title, employment[1].employer],
  ['employment.hcl-prior.employer', employment[1].employer, employment[1].employer],
  ['employment.hcl-prior.location', employment[1].location, employment[1].employer],
  ['employment.hcl-prior.period', employment[1].period, employment[1].employer],
  ['education.0.qualification', education[0].qualification, null],
  ['education.0.institution', education[0].institution, null],
  ['education.0.period', education[0].period, null],
  ['education.0.resultLabel', education[0].resultLabel, null],
  ['education.0.result', education[0].result, null]
];

const provenanceFixtures = [
  ...canonicalFieldFixtures.map(([key, statement, employer]) => ({
    key,
    statement,
    sourceRef: canonicalValueSourceRefs[key],
    employer
  })),
  ...allowedRoleLabels.map((role) => ({
    key: `allowedRoleLabels.${role}`,
    statement: role,
    sourceRef: sourceRefs.allowedRoleLabels[role],
    employer: role === employment[0].title ? employment[0].employer : null
  })),
  ...Object.entries(skillGroups).flatMap(([group, skills]) =>
    skills.map((skill) => ({
      key: `skillGroups.${group}.${skill}`,
      statement: skill,
      sourceRef: sourceRefs.skillGroups[group][skill],
      employer: null
    }))
  ),
  ...Object.entries(employerResponsibilities).flatMap(
    ([employer, responsibilities]) => responsibilities.flatMap((responsibility) => [
      {
        key: `employerResponsibilities.${employer}.${responsibility.id}`,
        statement: responsibility.responsibility,
        sourceRef: responsibility.sourceRef,
        employer
      },
      ...responsibility.details.map((detail) => ({
        key: `employerResponsibilities.${employer}.${responsibility.id}.${detail}`,
        statement: detail,
        sourceRef: responsibility.sourceRef,
        employer
      }))
    ])
  )
];

const canonicalManifest = {
  canonicalValues,
  identity,
  contact,
  profile,
  allowedRoleLabels,
  skillGroups,
  forbiddenClaimPatterns,
  employment,
  employerResponsibilities,
  education,
  expectedCounts: {
    currentInforRoles: 1,
    educationRecords: 1,
    skillGroups: 6
  },
  sourceRefs
};

module.exports = deepFreeze({
  canonicalManifest,
  provenanceFixtures
});
