import {
  PricingRule,
  PricingRulePayload,
  RuleOperation,
  SUPPORTED_RULE_TYPES,
  SupportedRuleType,
  TypePricingConfig,
} from './Ipricing';

export const EMPTY_CONFIG: TypePricingConfig = {
  hourlyRate: null,
  minimumCharge: null,
  fullDayMaximum: null,
  rounding: { mode: 'none', minutes: null },
};

const activeValue = (rules: PricingRule[], type: SupportedRuleType): number | null =>
  rules.find((r) => r.ruleType === type && r.isActive)?.value ?? null;

/** rules[] (الـ API) → الفورم */
export function rulesToConfig(rules: PricingRule[]): TypePricingConfig {
  const up = activeValue(rules, 'RoundUp');
  const down = activeValue(rules, 'RoundDown');

  return {
    hourlyRate: activeValue(rules, 'HourlyRate'),
    minimumCharge: activeValue(rules, 'MinimumCharge'),
    fullDayMaximum: activeValue(rules, 'FullDayMaximum'),
    rounding: up
      ? { mode: 'up', minutes: up }
      : down
        ? { mode: 'down', minutes: down }
        : { mode: 'none', minutes: null },
  };
}

/** النوع جاهز للـ checkout لو عنده سعر ساعة أكبر من صفر. */
export const isReadyForCheckout = (config: TypePricingConfig): boolean =>
  (config.hourlyRate ?? 0) > 0;

type DesiredValues = Record<SupportedRuleType, number | undefined>;

/** القيمة المطلوبة لكل نوع rule (undefined = مش مطلوب) */
function desiredValues(config: TypePricingConfig): DesiredValues {
  const positive = (v: number | null) => (v !== null && v > 0 ? v : undefined);
  const { mode, minutes } = config.rounding;

  return {
    HourlyRate: positive(config.hourlyRate),
    MinimumCharge: positive(config.minimumCharge),
    FullDayMaximum: positive(config.fullDayMaximum),
    RoundUp: mode === 'up' ? positive(minutes) : undefined,
    RoundDown: mode === 'down' ? positive(minutes) : undefined,
  };
}

const newPayload = (
  planId: number,
  typeId: number,
  ruleType: SupportedRuleType,
  value: number,
): PricingRulePayload => ({
  pricingPlanId: planId,
  workspaceTypeId: typeId,
  ruleType,
  value,
  startDate: null,
  endDate: null,
  dayOfWeek: null,
  isActive: true,
});

/** بيحافظ على التواريخ/اليوم الموجودين على الـ rule بدل ما يمسحهم. */
const updatedPayload = (rule: PricingRule, value: number): PricingRulePayload => ({
  pricingPlanId: rule.pricingPlanId,
  workspaceTypeId: rule.workspaceTypeId,
  ruleType: rule.ruleType,
  value,
  startDate: rule.startDate,
  endDate: rule.endDate,
  dayOfWeek: rule.dayOfWeek,
  isActive: true,
});

/** الفرق بين الحالي والمطلوب → عمليات create / update / delete */
export function configToOperations(
  planId: number,
  typeId: number,
  existing: PricingRule[],
  config: TypePricingConfig,
): RuleOperation[] {
  const desired = desiredValues(config);
  const operations: RuleOperation[] = [];

  for (const ruleType of SUPPORTED_RULE_TYPES) {
    const current = existing.find((r) => r.ruleType === ruleType);
    const value = desired[ruleType];

    if (value === undefined) {
      if (current) operations.push({ kind: 'delete', id: current.id });
      continue;
    }

    if (!current) {
      operations.push({ kind: 'create', payload: newPayload(planId, typeId, ruleType, value) });
    } else if (current.value !== value || !current.isActive) {
      operations.push({ kind: 'update', id: current.id, payload: updatedPayload(current, value) });
    }
  }

  return operations;
}
