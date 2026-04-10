import { Doctor } from '@/lib/types'
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Award, Heart, MapPin, Star, Clock, BadgeCheck } from 'lucide-react'
import { Badge } from '../ui/badge'

interface DoctorProfileInterface {
  doctor: Doctor
}

const DoctorProfile = ({ doctor }: DoctorProfileInterface) => {
  return (
    <Card className="sticky top-8 overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
      {/* Hero banner */}
      <div className="relative h-28 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600" />

      <CardContent className="px-6 pb-6 pt-0">
        {/* Avatar — overlaps banner */}
        <div className="relative -mt-14 mb-4 flex flex-col items-center">
          <Avatar className="h-28 w-28 ring-4 ring-white shadow-lg">
            <AvatarImage
              src={doctor?.profileImage}
              alt={doctor?.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-3xl font-bold text-white">
              {doctor?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {doctor.isVerified && (
            <span className="mt-2 flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          )}
        </div>

        {/* Name & meta */}
        <div className="mb-5 text-center">
          <h2 className="text-xl font-bold text-gray-900">{doctor.name}</h2>
          <p className="mt-0.5 text-sm font-medium text-indigo-600">{doctor.specialization}</p>
          <p className="mt-0.5 text-xs text-gray-400">{doctor.qualification}</p>

          {/* Stats row */}
          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="mt-0.5 text-xs text-gray-500">5.0 Rating</span>
            </div>

            <div className="h-8 w-px bg-gray-200" />

            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-gray-800">{doctor.experience}+</span>
              <span className="text-xs text-gray-500">Yrs Exp.</span>
            </div>

            <div className="h-8 w-px bg-gray-200" />

            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-gray-800">New</span>
              <span className="text-xs text-gray-500">Doctor</span>
            </div>
          </div>
        </div>

        {/* Category badges */}
        {doctor.category.length > 0 && (
          <div className="mb-5 flex flex-wrap justify-center gap-1.5">
            {doctor.category.map((cat, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="rounded-full bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 hover:bg-indigo-100"
              >
                <Award className="mr-1 h-3 w-3" />
                {cat}
              </Badge>
            ))}
          </div>
        )}

        {/* Divider */}
        <hr className="mb-5 border-gray-100" />

        {/* About */}
        <div className="mb-4">
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
            About
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">{doctor.about}</p>
        </div>

        {/* Hospital info */}
        {doctor.hospitalInfo && (
          <div className="mb-4 rounded-xl bg-gray-50 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Hospital / Clinic
            </h3>
            <p className="text-sm font-semibold text-gray-800">{doctor.hospitalInfo.name}</p>
            <p className="mt-0.5 text-xs text-gray-500">{doctor.hospitalInfo.address}</p>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5 text-indigo-400" />
              {doctor.hospitalInfo.city}
            </div>
          </div>
        )}

        {/* Consultation fee */}
        <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-md shadow-emerald-100">
          <div>
            <p className="text-xs font-medium text-emerald-100">Consultation Fee</p>
            <p className="mt-0.5 text-3xl font-extrabold tracking-tight">{doctor.fees}</p>
            <div className="mt-1 flex items-center gap-1 text-xs text-emerald-200">
              <Clock className="h-3.5 w-3.5" />
              {doctor.slotDurationMinutes} min session
            </div>
          </div>
          <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
            <Heart className="h-7 w-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default DoctorProfile