export interface User {
  id: number;
  name: string;
  email: string;
  password;
  role: 'cliente' | 'admin';
}

export interface Service {
  id: number;
  name: string;
  price: number;
}

export const users: User[] = [
  {
    id: 1,
    name: 'Admin Barbearia',
    email: 'admin@barberflow.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    id: 2,
    name: 'Cliente Teste',
    email: 'cliente@teste.com',
    password: 'cliente123',
    role: 'cliente',
  },
];

export const services: Service[] = [
  { id: 1, name: 'Corte de Cabelo', price: 35.0 },
  { id: 2, name: 'Barba', price: 25.0 },
  { id: 3, name: 'Corte + Barba', price: 55.0 },
  { id: 4, name: 'Pezinho', price: 10.0 },
];