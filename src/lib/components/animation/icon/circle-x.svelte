<script lang="ts">
  import { cn } from '$lib/utils';
  import { createEventDispatcher, tick } from 'svelte';
  import { draw, type DrawParams } from 'svelte/transition';

  type $$Props = {
    drawParams?: {
      left: DrawParams;
      right: DrawParams;
      circle: DrawParams;
    };
    class?: string;
    size?: number;
    color?: string;
    strokeWidth?: number;
  };

  export let drawParams: $$Props['drawParams'] = {
    left: { duration: 1000 },
    right: { duration: 1000 },
    circle: { duration: 1000 }
  };
  let className: $$Props['class'] = undefined;
  export let size: $$Props['size'] = 24;
  export let color: $$Props['color'] = 'currentColor';
  export let strokeWidth: $$Props['strokeWidth'] = 2;
  export { className as class };

  let show: boolean = true;
  export const restart = async () => {
    show = false;
    await tick();
    show = true;
  };

  const dispatch = createEventDispatcher();
  let circleIntroEnd: boolean = false;
  let circleOutroEnd: boolean = false;
  let leftIntroEnd: boolean = false;
  let leftOutroEnd: boolean = false;
  let rightIntroEnd: boolean = false;
  let rightOutroEnd: boolean = false;

  $: if (circleIntroEnd && leftIntroEnd && rightIntroEnd) {
    dispatch('introend');
  }
  $: if (circleOutroEnd && leftOutroEnd && rightOutroEnd) {
    dispatch('outroend');
  }
</script>

{#if show}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    class={cn('lucide lucide-circle-x', className)}
    {...$$restProps}
  >
    <path
      on:introstart={() => dispatch('circleintrostart')}
      on:introend={() => {
        circleIntroEnd = true;
        dispatch('circleintroend');
      }}
      on:outrostart={() => dispatch('circleoutrostart')}
      on:outroend={() => {
        circleOutroEnd = true;
        dispatch('circleoutroend');
      }}
      d="M12 2 A 10 10 0 0 1 12 22 A 10 10 0 0 1 12 2"
      in:draw|global={drawParams?.circle}
    />
    <path
      on:introstart={() => dispatch('leftintrostart')}
      on:introend={() => {
        leftIntroEnd = true;
        dispatch('leftintroend');
      }}
      on:outrostart={() => dispatch('leftoutrostart')}
      on:outroend={() => {
        leftOutroEnd = true;
        dispatch('leftoutroend');
      }}
      d="m15 9-6 6"
      in:draw|global={drawParams?.left}
    />
    <path
      on:introstart={() => dispatch('rightintrostart')}
      on:introend={() => {
        rightIntroEnd = true;
        dispatch('rightintroend');
      }}
      on:outrostart={() => dispatch('rightoutrostart')}
      on:outroend={() => {
        rightOutroEnd = true;
        dispatch('rightoutroend');
      }}
      d="m9 9 6 6"
      in:draw|global={drawParams?.right}
    />
  </svg>
{/if}
