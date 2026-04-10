'use client';
import React from 'react'
import { Button } from '../ui/button'
import Link from 'next/link'
import { healthcareCategories } from '@/lib/constant'
import { useRouter } from 'next/navigation';
import { userAuthStore } from '@/store/authStore';

const LandingHero = () => {
    const {isAuthenticated} = userAuthStore();
    const router = useRouter();

    const handleBookConsultation = () => {
        if(isAuthenticated) {
            router.push('/doctor-list');
        }else{
            router.push('/signup/patient')
        }
    }

    const handleCategoryClick = (categoryTitle:string) => {
            if(isAuthenticated) {
                router.push(`/doctor-list?category=${categoryTitle}`)
            }
            else{
                router.push('/signup/patient')
            }
    }
  return (
    <section className='py-20 px-4 bg-gradient-to-b from-blue-50 to-white'>
        <div className='container mx-auto text-center'>
            <h1 className='text-5xl md:text-6xl font-bold text-blue-900 leading-tight mb-6'>
                The Space Where  <br/>
                <span>
                    Doctors Listen - To You
                </span>
            </h1>
            <p className='text-xl text-gray-600 mb-8 max-w-2xl mx-auto'>
                Experience healthcare like never before with UniCare+. Our platform connects you with top-notch medical professionals who prioritize your well-being. Book consultations, access personalized care plans, and manage your health effortlessly. Your journey to better health starts here.
            </p>
            <div className='flex flex-col sm:flex-row gap-4 justify-center mb-12'>
                    <Button onClick={handleBookConsultation} size='lg' className='bg-gradient-to-r from-blue-600 to-blue-700 hover:from-red-700 hover:to-red-800 rounded-full px-8 py-3 text-lg'>
                        Book a video visit
                    </Button>
                    <Link href='/login/doctor'>
                        <Button size='lg' variant='outline' className='w-full border-blue-600 text-blue-600 hover:bg-red-50 rounded-full px-8 py-3 text-lg'>
                            Login as Doctor
                        </Button>
                    </Link>
                    
            </div>

            {/* Healthcare Categories */}

            <section className='py-6'>
                <div className='container mx-auto px-4'>
                    <div className='flex justify-center items-center overflow-x-auto gap-6 pb-2 scrollbar-hide mx-auto'>
                        {healthcareCategories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => handleCategoryClick(category.title)}
                                className='flex flex-col items-center min-w-[100px] group transition-transform'
                                >
                                <div className={`w-12 h-12 ${category.color} rounded-2xl flex items-center justify-center mb-2 group-hover:shadow-xl transition-all duration-200`}>
                                    <svg className='w-6 h-6 text-white' fill='currentColor' viewBox='0 0 24 24'>
                                        <path d={category.icon}/>
                                    </svg>
                                </div>
                                <span className='text-xs font-medium text-blue-900 text-center leading-tight'>
                                    {category.title}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

            </section>

            {/* Trust Indicator */}

            <div className='flex flex-wrap justify-center items-center gap-8 text-sm text-gray-600'>
                <div className='flex items-center space-x-2'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'>
                    </div>

                    <span>500+ Certified Doctors</span>
                </div>
                <div className='flex items-center space-x-2'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'>
                    </div>

                    <span>50,000+ Satiesfied Patients</span>
                </div>
                <div className='flex items-center space-x-2'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'>
                    </div>

                    <span>24/7 Available</span>
                </div>
            </div>
        </div>
    </section>
  )
}

export default LandingHero
