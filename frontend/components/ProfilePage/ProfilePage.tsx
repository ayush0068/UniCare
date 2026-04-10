'use client'

import { healthcareCategories, specializations } from '@/lib/constant';
import { userAuthStore } from '@/store/authStore'
import { Clock, FileText, Heart, MapPin, Phone, Plus, Stethoscope, User, X } from 'lucide-react';
import React, { ChangeEvent, useEffect, useState } from 'react'
import { start } from 'repl';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import Header from '../landing/Header';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Value } from '@radix-ui/react-select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';




interface ProfileProps {
    userType : 'doctor' | 'patient'
}

const ProfilePage = ({userType} : ProfileProps) => {

    const {user, fetchProfile, updateProfile, loading} = userAuthStore();
    const [activeSection, setActiveSection] = useState('about');
    const [isEditing, setIsEditing] = useState(false);

    const [formData, setFormData] = useState<any>({
        name: '',
        email: '',
        phone: '',
        dob: '',
        gender: '', 
        bloodGroup: '',
        about: '',
        specializations: '',
        category: '',
        qualification: '',
        experience: '',
        fees: 0,
        hospitalInfo: {
            name: '',
            address: '',
            city: '',
        },
        medicalHistory: {
            allergies: '',
            currentMedications: '',
            chronicConditions: '',
        },
        emergencyContact: {
            name: '',
            phone: '',
            relationship: '',
        },
        availabilityRange: {
            startDate: '',
            endDate: '',
            excludedWeekdays: [],
        },
        dailyTimeRanges: [],
        slotDurationMinutes: 30,
    });

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    useEffect(() => {
        if(user) {
            
            setFormData({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || '',
                dob: user.dob || '',
                gender: user.gender || '',
                bloodGroup: user.bloodGroup || '',
                about: user.about || '',
                specializations: user.specialization || '',
                category: user.category || '',
                qualification: user.qualification || '',
                experience: user.experience || '',
                fees: user.fees || 0,
                hospitalInfo: {
                    name: user.hospitalInfo?.name || '',
                    address: user.hospitalInfo?.address || '',
                    city: user.hospitalInfo?.city || '',
                },
                medicalHistory: {
                    allergies: user.medicalHistory?.allergies || '',
                    currentMedications: user.medicalHistory?.currentMedications || '',
                    chronicConditions: user.medicalHistory?.chronicConditions || '',
                },
                emergencyContact: {
                    name: user.emergencyContact?.name || '',
                    phone: user.emergencyContact?.phone || '',
                    relationship: user.emergencyContact?.relationship || '',
                },
                availabilityRange: {
                    startDate: user.availabilityRange?.startDate || '',
                    endDate: user.availabilityRange?.endDate || '',
                    excludedWeekdays: user.availabilityRange?.excludedWeekdays || [],
                },
                dailyTimeRanges: user.dailyTimeRanges || [],
                slotDurationMinutes: user.slotDurationMinutes || 30
            });
        }
    },[user]);

    const handleInputChange = (field: string, value: any) => {

        if (field.includes('.')) {
            const [parent, child] = field.split('.');

            setFormData((prev: any) => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }))
        }else{
            setFormData((prev: any) => ({...prev, [field]: value}))
        }

    };

    const handleArrayChange = (
        field: string,
        index: number,
        subField: string,
        value: any
    ) => {
        setFormData((prev: any) => ({
            ...prev,
            [field]: prev[field].map((item: any, i: number) => 
            i===index ? {...item, [subField]: value}: item
        ),
        }));
    }



    const handleCategorySelect = (category: any): void => {
        if(!formData.category.includes(category.title)) {
            handleInputChange('category', [...formData.category, category.title])
        }
    };

    const handleCategoryDelete = (indexToDelete: number) => {
        const currentCategories = [...formData.category];
        const newCategories = currentCategories.filter((_:any, i:number) =>  i !== indexToDelete);
        setFormData((prev: any) => ({
            ...prev,
            category: newCategories,
        }))
    }


    const  getAvailableCategories = () => {
        return healthcareCategories.filter((cat) => !formData.category.includes(cat.title))
    }


    const addTimeRange = () => {
        setFormData((prev: any) => ({
            ...prev,
            dailyTimeRanges: [...prev.dailyTimeRanges, {start: '09:00', end: '17:00'}]
        }))
    }

    const removeTimeRange = (index:number) => {
        setFormData((prev: any) => ({
            ...prev,
            dailyTimeRanges: prev.dailyTimeRanges.filter(
                (_:any, i:number) => i !== index
            )
        }))
    }

    const handleWeekdayToogle = (weekday: number) => {
        const excludedWeekdays = [...formData.availabilityRange.excludedWeekdays];
        const index = excludedWeekdays.indexOf(weekday);

        if(index > -1) {
            excludedWeekdays.splice(index, 1);
        } else {
            excludedWeekdays.push(weekday);
        }


        handleInputChange('availabilityRange.excludedWeekdays', excludedWeekdays)
    }

    const handleSave = async () => {
        try {
            await updateProfile(formData)
            setIsEditing(false);
        } catch (error) {
            console.error(error)
        }
    };

    const formatDateForInput = (isoDate: string) : string => {
        if(!isoDate) return '';
        const date = new Date(isoDate);
        if(isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
    };

    const sidebarItems = userType === 'doctor'?
        [
            {id: 'about', label: 'About', icon: User },
            {id: 'professional', label: 'Professional Info', icon: Stethoscope},
            {id: 'hospital', label: 'Hospital Information', icon: MapPin},
            {id: 'availability', label: 'Availability', icon: Clock},
        ]

        :
        [
            {id: 'about', label: 'About', icon: User },
            {id: 'contact', label: 'Contact', icon: Phone},
            {id: 'medical', label: 'Medical History', icon: FileText},
            {id: 'emergency', label: 'Emergency Contact', icon: Phone},
        ]; 


    const  renderAboutSection = () => (
        <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='flex flex-col gap-2'>
                    <Label>Legal First Name</Label>
                    <Input 
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        disabled={!isEditing}
                        className='w-80'
                    />
                </div>
                
            </div>

            {userType === 'patient' && (
                <>
                    <div className='flex flex-col gap-2'>
                        <Label>Official Date of Birth</Label>
                        <Input
                            type='date'
                            value={formData.dob ? new Date(formData.dob).toISOString().split('T')[0] : ''}
                            onChange={(e) => handleInputChange('dob', e.target.value ? new Date(formData.dob).toISOString().split('T')[0] : '')}
                            disabled={!isEditing}
                            className='w-80'
                        />
                    </div>

                    <div className='flex flex-col gap-2'>
                        <Label>Gender</Label>
                        <RadioGroup 
                            value={formData.gender || ''}
                            onValueChange={(value) => handleInputChange('gender', value)}
                            disabled={!isEditing}
                            className='flex space-y-2'  
                        >

                            <div className='flex items-center space-x-2'>
                                <RadioGroupItem value='male' id='male' />
                                <Label htmlFor='male' >
                                    Male
                                </Label>
                            </div>

                            <div className='flex items-center space-x-2'>
                                <RadioGroupItem value='female' id='female' />
                                <Label htmlFor='female' >
                                    Female
                                </Label>
                            </div>

                            <div className='flex items-center space-x-2'>
                                <RadioGroupItem value='other' id='other' />
                                <Label htmlFor='other' >
                                    Other
                                </Label>
                            </div>

                        </RadioGroup>
                    </div>

                    <div className='flex flex-col gap-2'>
                        <Label>Blood Group</Label>
                        <Select 
                            value={formData.bloodGroup || ''}
                            onValueChange={(value) => handleInputChange('bloodGroup', value)}
                            disabled={!isEditing}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder='Select Blood Group'/>
                            </SelectTrigger>

                            <SelectContent>
                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((group) => (
                                    <SelectItem 
                                        key={group}
                                        value={group}
                                    >
                                        {group}
                                    </SelectItem>
                                ))}
                            </SelectContent>

                        </Select>
                    </div>
                </>
            )}

            {userType === 'doctor' && (
                <div>
                    <Label>
                        About
                    </Label>
                    <Textarea 
                        value={formData.about || ''}
                        onChange={(e) => handleInputChange('about', e.target.value)}
                        disabled={!isEditing}
                        rows={4}
                    />

                </div>
            )}
        </div>
    );

    const renderProfessionalSection = () => (
        <div className='space-y-6'>
            <div className='flex flex-col gap-2'>
                <Label>Specialization</Label>
                <Select
                    value={formData.specialization || ''}
                    onValueChange={(value) => handleInputChange('specialization', value)}
                    disabled={!isEditing}
                >
                    <SelectTrigger>
                        <SelectValue placeholder='Select Specialization' />
                    </SelectTrigger>

                    <SelectContent>
                        {specializations.map((specs) => (
                            <SelectItem
                                key={specs}
                                value={specs}
                            >
                                {specs}
                            </SelectItem>
                        ))}
                    </SelectContent>


                </Select>
            </div>

                <div className='flex flex-col gap-2'>
                        <Label>Category</Label>
                        <div className='flex flex-wrap gap-2 mt-2'>
                            {formData.category?.map((cat: string, index: number) => (
                                <Badge
                                    key={index}
                                    variant='secondary'
                                    className={`flex items-center space-x-2 text-white ${healthcareCategories.find(c => c.title === cat)?.color || 'bg-gray-400'
                                        }`}
                                >
                                    <span>{cat}</span>
                                    {isEditing && (
                                        <button
                                            type='button'
                                            className='ml-1 p-0 border-0 bg-transparent cursor-pointer hover:bg-gray-200 rounded-full'
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleCategoryDelete(index);
                                            }}
                                        >
                                            <X className='w-3 h-3' />

                                        </button>
                                    )}
                                </Badge>

                            ))}

                            {isEditing && getAvailableCategories().length > 0 && (
                                <Select
                                    onValueChange={(value) => {
                                        const selectedCategory = getAvailableCategories().find(cate => cate.id === value);
                                        if(selectedCategory) {
                                            handleCategorySelect(selectedCategory)
                                        }
                                    }}
                                >   
                                    <SelectTrigger className='w-48'>
                                        <SelectValue placeholder='Select Category' />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getAvailableCategories().map((category) => (
                                            <SelectItem
                                                key={category.id}
                                                value={category.id}
                                            >
                                                <div className='flex items-center space-x-2'>
                                                    <div className={`w-3 h-3 rounded-full ${category.color}`}>

                                                    </div>
                                                    <span>
                                                        {category.title}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}

                                    </SelectContent>

                                </Select>
                            )}

                            {isEditing && getAvailableCategories().length === 0 && (
                                <span className='text-sm gray-500'>
                                    All categories have been selected
                                </span>
                            )}
                        </div>
                </div>

                <div className='flex flex-col gap-2'>
                    <Label>Qualification</Label>
                    <Input 
                        value={formData.qualification || ''}
                        onChange={(e) => handleInputChange('qualification', e.target.value)}
                        disabled={!isEditing}
                        
                    />
                </div>

                <div className='flex flex-col gap-2'>
                    <Label>Experience (Years)</Label>
                    <Input
                        type='number' 
                        value={formData.experience || ''}
                        onChange={(e) => handleInputChange('experience', parseInt(e.target.value) || 0) }
                        disabled={!isEditing}
                        
                    />
                </div>
                
                <div className='flex flex-col gap-2'>
                    <Label>Consultation Fee(₹)</Label>
                    <Input 
                        type='number'
                        value={formData.fees}
                        onChange={(e) => handleInputChange('fees', parseInt(e.target.value) || 0)}
                        disabled={!isEditing}
                        
                    />
                </div>
        </div>
    );

    const renderHospitalSection = () => (
        <div className='space-y-6'>
            <div className='flex flex-col gap-2'>
                    <Label>Hospital/Clinic Name</Label>
                    <Input 
                        value={formData.hospitalInfo.name}
                        onChange={(e) => handleInputChange('hospitalInfo.name', e.target.value)}
                        disabled={!isEditing}
                        
                    />
            </div>

            <div className='flex flex-col gap-2'>
                    <Label>Address</Label>
                    <Textarea
                        value={formData.hospitalInfo.address}
                        onChange={(e) => handleInputChange('hospitalInfo.address', e.target.value)}
                        disabled={!isEditing}
                        rows={3}
                    />
            </div>

            <div className='flex flex-col gap-2'>
                    <Label>City</Label>
                    <Input 
                        value={formData.hospitalInfo.city}
                        onChange={(e) => handleInputChange('hospitalInfo.city', e.target.value)}
                        disabled={!isEditing}
                        
                    />
            </div>
        </div>
    );

    const renderAvailabilitySection = () => (
        <div className='space-y-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='flex flex-col gap-2'>
                    <Label>Available From</Label>
                    <Input 
                        type='date'
                        value={formatDateForInput(formData.availabilityRange.startDate)}
                        onChange={(e) => handleInputChange('availabilityRange.startDate', e.target.value)}
                        disabled={!isEditing}
                        
                    />
                </div>

                <div className='flex flex-col gap-2'>
                    <Label>Available Until</Label>
                    <Input 
                        type='date'
                        value={formatDateForInput(formData.availabilityRange.endDate)}
                        onChange={(e) => handleInputChange('availabilityRange.endDate', e.target.value)}
                        disabled={!isEditing}
                        
                    />
                </div>
            </div>
            
            <div className='flex flex-col gap-2'>
                <Label>Excluded Weekdays</Label>
                <div className='flex flex-wrap gap-2'>
                    {[
                        'Sunday',
                        'Monday',
                        'TuesDay',
                        'Wednesday',
                        'Thursday',
                        'Friday',
                        'Saturday',
                    ].map((day, index) => (
                        <label key={index} className='flex items-center space-x-2'>
                            <Checkbox
                                checked={
                                    formData.availabilityRange?.excludedWeekdays.includes(index) || false
                                }
                                onCheckedChange={() => handleWeekdayToogle(index)}
                                disabled={!isEditing}
                            />
                            <span className='text-sm'>{day}</span>
                            
                        </label>
                    ))}
                </div>
            </div>


                    <div className='flex flex-col gap-2'>
                        <Label>Daily Time Range</Label>
                        <div className='space-y-3'>
                            {formData.dailyTimeRanges?.map((timeRange: any, index: number) => (
                                <div className='flex items-center space-x-2' key={index}>
                                        <Input 
                                            type='time'
                                            value={timeRange.start || ''}
                                            onChange={(e) => handleArrayChange('dailyTimeRanges', index, 'start', e.target.value)}
                                            disabled={!isEditing}
                                        />
                                        <span>To</span>
                                        <Input 
                                            type='time'
                                            value={timeRange.end || ''}
                                            onChange={(e) => handleArrayChange('dailyTimeRanges', index, 'end', e.target.value)}
                                            disabled={!isEditing}
                                        />


                                        {isEditing && (
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => removeTimeRange(index)}
                                            >
                                                <X className='w-4 h-4' />
                                            </Button>
                                        )}
                                </div>
                            ))}

                            {isEditing && (
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={addTimeRange}
                                >
                                    <Plus className='w-4 h-4 mr-2'/>
                                    Add Time Range
                                </Button>
                            )}
                        </div>
                    </div>

            <div className='flex flex-col gap-2'>
                <Label>
                    Slot Duration (minutes)
                </Label>
                <Select
                    value={formData.slotDurationMinutes?.toString() || '30'}
                    onValueChange={(value) => handleInputChange('slotDurationMinutes', parseInt(value))}
                    disabled={!isEditing}
                >
                    <SelectTrigger>
                        <SelectValue placeholder='Select Slot Duration' />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value='15'>15 Minutes</SelectItem>
                        <SelectItem value='20'>20 Minutes</SelectItem>
                        <SelectItem value='30'>30 Minutes</SelectItem>
                        <SelectItem value='45'>45 Minutes</SelectItem>
                        <SelectItem value='60'>60 Minutes</SelectItem>
                        <SelectItem value='90'>90 Minutes</SelectItem>
                        <SelectItem value='120'>120 Minutes</SelectItem>

                    </SelectContent>
                </Select>
            </div>
        </div>
    );


    const renderContactSection = () => (
        <div className='space-y-6'>
            <div className='flex flex-col gap-2'>
                    <Label>Phone Number</Label>
                    <Input 
                        placeholder='+91-94xxxxxx99'
                        value={formData.phone || ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing}
                    />
            </div>

            <div className='flex flex-col gap-2'>
                    <Label>Email</Label>
                    <Input 
                        value={formData.email || ''}
                        readOnly
                        disabled={!isEditing}
                    />
            </div>
        </div>
    )

    const renderMedicalSection = () => (
        <div className='space-y-6'>
            <div className='flex flex-col gap-2'>
                <Label>Allergies</Label>
                <Textarea
                    value={formData.medicalHistory.allergies || ''}
                    onChange={(e) => handleInputChange('medicalHistory.allergies', e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                />
            </div>

            <div className='flex flex-col gap-2'>
                <Label>Current Medications</Label>
                <Textarea
                    value={formData.medicalHistory.currentMedications || ''}
                    onChange={(e) => handleInputChange('medicalHistory.currentMedications', e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                />
            </div>

            <div className='flex flex-col gap-2'>
                <Label>Chronic Conditions</Label>
                <Textarea
                    value={formData.medicalHistory.chronicConditions || ''}
                    onChange={(e) => handleInputChange('medicalHistory.chronicConditions', e.target.value)}
                    disabled={!isEditing}
                    rows={3}
                />
            </div>
        </div>
    ); 


    const renderEmergencySection = () => (
        <div className='space-y-6'>
            <div className='flex flex-col gap-2'>
                    <Label>Emergency Contact Name</Label>
                    <Input 
                        value={formData.emergencyContact.name|| ''}
                        onChange={(e) => handleInputChange('emergencyContact.name', e.target.value)}
                        disabled={!isEditing}
                    />
            </div>

            <div className='flex flex-col gap-2'>
                    <Label>Emergency Contact Relationship</Label>
                    <Input 
                        value={formData.emergencyContact.relationship|| ''}
                        onChange={(e) => handleInputChange('emergencyContact.relationship', e.target.value)}
                        disabled={!isEditing}
                    />
            </div>

            <div className='flex flex-col gap-2'>
                    <Label>Emergency Contact Phone</Label>
                    <Input 
                        value={formData.emergencyContact.phone|| ''}
                        onChange={(e) => handleInputChange('emergencyContact.phone', e.target.value)}
                        disabled={!isEditing}
                    />
            </div>
        </div>
    )

    const renderContent = () => {
        switch (activeSection) {
            case 'about':
                return renderAboutSection()
            
            case 'professional':
                return renderProfessionalSection()

            case 'hospital':
                return renderHospitalSection()

            case 'availability':
                return renderAvailabilitySection()

            case 'contact':
                return renderContactSection()

            case 'medical':
                return renderMedicalSection()

            case 'emergency':
                return renderEmergencySection()

            default:
                return renderAboutSection()
        }
    }
    

    if(!user) return <div>Loading....</div>
  return (
    <>
        <Header showDashboardNav={true} />
        <div className='min-h-screen bg-gray-50 pt-16'>
            <div className='container mx-auto px-4 py-8'>
                <div className='mb-8'>
                    <h1 className='text-3xl font-bold text-gray-900'>
                        Records
                    </h1>
                </div>

                <div className='flex items-center space-x-8 mb-8'>
                    <div className='flex flex-col items-center'>
                        <Avatar className='w-24 h-24'>
                            <AvatarImage src={user?.profileImage} alt={user?.name} />
                            <AvatarFallback className='bg-blue-100 text-blue-600 text-2xl font-bold'>
                                {user?.name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <p className='mt-2 text-lg font-semibold'>
                            {user?.name}
                        </p>
                    </div>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-4 gap-8'>
                    <div className='lg:col-span-1'>
                        <div className='space-y-2'>
                            {sidebarItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${activeSection === item.id ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    <item.icon className='w-5 h-5' />
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className='lg:col-span-3'>
                        <Card>
                            <CardContent>
                                <div className='flex items-center justify-between mb-6'>
                                    <h2 className='text-2xl font-semibold capitalize'>
                                        {sidebarItems.find((item) => item.id === activeSection)?.label}
                                    </h2>
                                
                                <div className='flex space-x-2'>
                                    {isEditing ? (
                                        <>
                                            <Button
                                                variant='outline'
                                                onClick={() => setIsEditing(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={handleSave}
                                                disabled={loading}
                                            >
                                                {loading ? 'Saving...' : 'Save'}
                                            </Button>
                                        </>
                                    ): (
                                        <Button
                                            onClick={() => setIsEditing(true)}
                                        >
                                            Edit
                                        </Button>
                                    )}
                                </div>
                                </div>
                                {renderContent()}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    </>
  )
}

export default ProfilePage
