/* api.constants.ts */
// src/app/core/constants/api.constants.ts
// para usar environment

// para produccion
import { environment } from '../../../environments/environment'; 
// para desarrollo
//import { environment } from '../../../environments/environment.development';

export const API_URL = environment.apiUrl;

export const API_ENDPOINTS = {
  clientes: `${API_URL}/clientes`,
  ordenes: `${API_URL}/ordenes`,
  pagos: `${API_URL}/pagos`,
  dashboard: `${API_URL}/dashboard`
};