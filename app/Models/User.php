<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Relay\KeyType;

class User extends Authenticatable
{
    use Notifiable, HasUuids;
    protected $keyType = 'string';
    public $incrementing = false;
    protected $table = 'users'; // or your custom table

    protected $fillable = [
        'name',
        'email',
        'password',
        'status',
        'address',
        'user_phone_no',
        'profile_pic',
        'user_dob',
        'status',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    public function student()
    {
        return $this->hasOne(student::class);
    }

    public function lecture()
    {
        return $this->hasOne(lecture::class);

    }

    public function system_admin()
    {
        return $this->hasOne(System_admin::class);
    }

    public function faculty()
    {
        return $this->hasOne(Faculty::class);
    }

    public function events()
    {
        return $this->hasMany(Event::class);
    }
}
