<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import { CopySecret } from '$lib/components/ui/copy';
  import { QRCode } from '$lib/components/ui/qr';
  import type { ActionData, PageData } from './$types';
  import OtpForm from './otp-form.svelte';
  import { goto } from '$app/navigation';

  export let data: PageData;
  export let form: ActionData;
</script>

<div class="h-screen">
  <div class="flex items-center justify-center h-screen">
    <div class="mx-auto grid w-[350px] gap-3">
      <div class="grid gap-2 text-center">
        <h1 class="text-3xl font-bold">2 Factor Authentication</h1>
        <p class="text-muted-foreground">Scan the QR code with your authenticator app</p>
      </div>

      <div class="py-10 flex flex-col items-center gap-12">
        <Card class="p-3">
          <QRCode class="w-[100px]" value={data.qrCodeLink} /></Card
        >

        <div class="flex flex-col gap-3">
          <p class=" text-muted-foreground text-sm text-center">
            If you are unable to scan, enter this secret code:
          </p>
          <CopySecret class="w-[320px]" copy={data.twoFactorSecret} size="xs" align="left" />
        </div>
      </div>

      <OtpForm data={data.otpForm} {form} />

      {#if form && form.success}
        <Button class="mt-2" on:click={() => goto('/auth/2fa/setup/recovery')}>Continue</Button>
      {:else}
        <Button disabled class="mt-2">Continue</Button>
      {/if}
    </div>
  </div>
</div>
