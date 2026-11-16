export function herbalGardenTabs(active: 'profession' | 'plots' | 'records' | 'guide') {
  return [
    { label: '职业', command: '/灵药师', selected: active === 'profession', autoEnter: false },
    { label: '灵田', command: '/灵田', selected: active === 'plots', autoEnter: false },
    { label: '记录', command: '/灵田记录', selected: active === 'records', autoEnter: false },
    { label: '指引', command: '/灵药师 指引', selected: active === 'guide', autoEnter: false }
  ];
}
