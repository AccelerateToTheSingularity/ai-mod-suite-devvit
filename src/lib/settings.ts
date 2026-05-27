export const getSafeModes = async () => {
  return {
    safeMode: true,
    flagOnly: true,
    reportOnly: true,
    modmailOnly: true,
    auditLogOnly: true,
    aiEnabledForSummons: true,
    aiEnabledForTLDR: true,
    noExposedRemoval: true
  };
};
