import crypto from 'crypto';

const hashString = (input) => {
  return crypto.createHash('fnv1a').update(input).digest('hex');
};

export const evaluateFlag = (flag, userContext = {}) => {
  if (!flag.isEnabled) {
    return flag.defaultValue;
  }

  for (const rule of flag.rules || []) {
    if (rule.type === 'targeting') {
      const conditionsMet = rule.conditions.every(condition => {
        const userValue = userContext[condition.attribute] || '';
        const targetValue = condition.value;

        switch (condition.operator) {
          case 'equals':
            return String(userValue) === String(targetValue);
          case 'notEquals':
            return String(userValue) !== String(targetValue);
          case 'contains':
            return String(userValue).includes(String(targetValue));
          case 'endsWith':
            return String(userValue).endsWith(String(targetValue));
          case 'startsWith':
            return String(userValue).startsWith(String(targetValue));
          case 'in':
            const inValues = targetValue.split(',').map(v => v.trim());
            return inValues.includes(String(userValue));
          default:
            return false;
        }
      });

      if (conditionsMet) {
        return rule.variation !== undefined ? rule.variation : true;
      }
    }

    if (rule.type === 'percentage') {
      const userId = userContext.userId || userContext.id || 'anonymous';
      const hashInput = `${userId}:${flag.key}`;
      const hashIndex = parseInt(hashString(hashInput), 16) % 100;

      if (hashIndex < rule.percentage) {
        return rule.variation !== undefined ? rule.variation : true;
      }
    }
  }

  if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
    const userId = userContext.userId || userContext.id || 'anonymous';
    const hashInput = `${userId}:${flag.key}`;
    const hashIndex = parseInt(hashString(hashInput), 16) % 100;

    if (hashIndex >= flag.rolloutPercentage) {
      return flag.defaultValue;
    }
  }

  return flag.defaultValue;
};

export const evaluateAllFlags = (flags, userContext = {}) => {
  const results = {};
  for (const flag of flags) {
    results[flag.key] = evaluateFlag(flag, userContext);
  }
  return results;
};