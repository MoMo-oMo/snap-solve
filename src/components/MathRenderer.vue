<template>
  <div class="math-renderer">
    <div v-if="shouldRenderLatex && renderedLatex" class="latex-content" v-html="renderedLatex"></div>
    <pre v-else class="text-content">{{ content }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css';

const props = withDefaults(
  defineProps<{
    content?: string;
    useLatex?: boolean;
    autoLatex?: boolean;
  }>(),
  { content: '', useLatex: false, autoLatex: true },
);

const shouldRenderLatex = computed(() => {
  if (!props.content) return false;
  if (props.useLatex) return true;
  if (!props.autoLatex) return false;

  const text = props.content;
  const hasBackslashCmd = /\\[a-zA-Z]+/.test(text);
  const hasMathTokens = /[=^_]/.test(text) || /\\(frac|sqrt|sum|int|theta|alpha|beta)/.test(text);
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const mathChars = (text.match(/[0-9=^_+*/()\\-]/g) || []).length;

  return hasBackslashCmd || (hasMathTokens && letters < mathChars * 0.6);
});

const renderedLatex = computed(() => {
  if (!shouldRenderLatex.value || !props.content) return '';
  try {
    return katex.renderToString(props.content, {
      displayMode: true,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return '';
  }
});
</script>

<style scoped>
.math-renderer {
  width: 100%;
}
.text-content {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: 'SF Mono', 'Fira Mono', 'Courier New', monospace;
  font-size: 1.05rem;
  color: var(--ion-text-color);
  line-height: 1.6;
}
.latex-content {
  overflow-x: auto;
  color: var(--ion-text-color);
}
</style>
