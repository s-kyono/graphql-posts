import SchemaBuilder from '@pothos/core';

interface Context {
  cookie?: string;
  profilesLoader: {
    load: (userId: string) => Promise<any>;
  };
  response?: {
    setHeader: (name: string, value: string | string[]) => void;
  };
}

export const builder = new SchemaBuilder<{
  Context: Context;
  DefaultFieldNullability: false;
}>({
  defaultFieldNullability: false,
});
