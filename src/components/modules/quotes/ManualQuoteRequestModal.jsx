      if (onSuccess && (sendMethod === 'system' || sendMethod === 'outlook')) {
        setTimeout(() => onSuccess(), 2000);