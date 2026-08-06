import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import { describe, expect, test } from 'vitest'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/solve', component: { template: '<div />' } },
    { path: '/check-work', component: { template: '<div />' } },
  ],
})

describe('HomePage.vue', () => {
  test('renders the SnapSolve hero and both action cards', () => {
    const wrapper = mount(HomePage, {
      global: { plugins: [router] },
    })
    expect(wrapper.text()).toMatch('SnapSolve')
    expect(wrapper.text()).toMatch('Scan a Problem')
    expect(wrapper.text()).toMatch('Check My Work')
  })
})
