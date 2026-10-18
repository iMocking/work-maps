import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'console',
    component: () => import('../layouts/LayConsole.vue'),
    redirect: '/dashboard',
    meta: { title: '驾驶舱' },
    children: [
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '数据驾驶舱' },
      },
    ],
  },
  {
    path: '/',
    name: 'admin',
    component: () => import('../layouts/LayAdmin.vue'),
    redirect: '/map-edit',
    meta: { title: '管理后台' },
    children: [
      {
        path: 'map-edit',
        name: 'map-edit',
        component: () => import('../views/admin/MapEdit.vue'),
        meta: { title: '地图编辑' },
      },
      {
        path: 'device-management',
        name: 'device-management',
        component: () => import('../views/admin/DeviceManagement.vue'),
        meta: { title: '设备管理' },
      },
      {
        path: 'fire-management',
        name: 'fire-management',
        component: () => import('../views/admin/FireManagement.vue'),
        meta: { title: '消防管理' },
      },
      {
        path: 'alarm-management',
        name: 'alarm-management',
        component: () => import('../views/admin/AlarmManagement.vue'),
        meta: { title: '告警管理' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'smooth' };
  },
});

export default router;
