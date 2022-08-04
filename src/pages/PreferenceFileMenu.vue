<!--
Copyright (c) 2008,2020 Silicon Labs.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
<template>
  <div>
    <div class="text-h4 q-mb-md">File Menu</div>
    <p>File Menu Items.</p>
    <div>
      <q-list bordered separator>

        <q-item clickable v-ripple @click="openNewConfiguration">
          <q-item-section>New Configuration...</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="openFile">
          <q-item-section>Open File...</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="save">
          <q-item-section>Save</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="saveAs">
          <q-item-section>Save as...</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="closeWindow">
          <q-item-section>Close</q-item-section>
        </q-item>

        <q-item clickable v-ripple @click="quit">
          <q-item-section>Quit</q-item-section>
        </q-item>

      </q-list>
    </div>
  </div>
</template>
<script>
    export default{
        methods: {
          quit() {
            this.$store.dispatch('zap/quitApplication')
          },
          openNewConfiguration() {
            this.$store.dispatch('zap/openNewConfiguration')
          },
          openFile() {
            this.$store.dispatch('zap/openFile')
          },
          save() {
            this.$store.dispatch('zap/save')
          },
          saveAs() {
            this.$store.dispatch('zap/saveAs')
          },
          closeWindow() {
            this.$store.dispatch('zap/closeWindow')
          }
        }
    }
</script>
