/** @format */

export interface BookingType {
    id?: number;
    garageId: number;
    garageAddress?: string;
    garageName?: string;
    serviceId: number;
    automobileId: number;
    userId?: number;
    reservedAt: Date;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface BookingWithDetails extends BookingType {

    user_name?: string;
    user_email?: string;
    user_phone?: string;
    user_address?: string;


    car_mark?: string;
    car_model?: string;
    car_matricule?: string;
    car_year?: number;


    address_type?: string;
}

export interface BookingSearchCriteria {
    userId?: number;
    garageId?: number;
    serviceId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}

export interface BookingStats {
    total_bookings: number;
    pending_bookings: number;
    confirmed_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    today_bookings: number;
    this_week_bookings: number;
}