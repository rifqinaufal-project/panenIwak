<script setup lang="ts">
import { resolveWorkspacePath } from '#shared/utils/workspace-routes';

definePageMeta({
  validate: route => resolveWorkspacePath(route.path) !== null,
});
</script>

<template>
  <WorkspaceApp />
</template>
