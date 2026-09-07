<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->boolean('has_meals')->default(false)->after('enter_from_gates');
            $table->date('meals_start_date')->nullable()->after('has_meals');
            $table->date('meals_end_date')->nullable()->after('meals_start_date');
            $table->decimal('meals_rate_per_night', 10, 2)->default(0.00)->after('meals_end_date');
            $table->decimal('meals_total_price', 10, 2)->default(0.00)->after('meals_rate_per_night');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('reservations', function (Blueprint $table) {
            $table->dropColumn([
                'has_meals',
                'meals_start_date',
                'meals_end_date',
                'meals_rate_per_night',
                'meals_total_price',
            ]);
        });
    }
};
