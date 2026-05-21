export type TaskStatus = 'Baslanmadi' | 'Devam_Ediyor' | 'Onay_Bekliyor' | 'Tamamlandi';
export type TaskPriority = 'Kritik' | 'Yuksek' | 'Orta' | 'Dusuk';
export type TaskCategory = 'Mekanik' | 'Elektrik' | 'Insaat' | 'Altyapi';

export interface IsTanimi {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  location: string;
  assignedTo: string; // Ekip veya Taşeron adı
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
}