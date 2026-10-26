declare namespace Deno {
  const env: {
    get(name: string): string | undefined;
  };

  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.48.0" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "https://esm.sh/@supabase/supabase-js" {
  export * from "@supabase/supabase-js";
}

declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "npm:@supabase/supabase-js" {
  export * from "@supabase/supabase-js";
}
