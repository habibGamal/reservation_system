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
        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('guest_id')->constrained('guests')->restrictOnDelete();
            $table->foreignId('unit_id')->constrained('units')->restrictOnDelete();
            $table->date('check_in');
            $table->date('check_out');
            $table->string('status', 50);
            $table->string('type', 50);
            $table->string('membership', 50)->nullable();
            $table->decimal('total_price', 10, 2)->default(0.00);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['unit_id', 'status', 'check_in', 'check_out'], 'res_unit_status_dates_idx');
            $table->index(['check_in', 'check_out'], 'res_dates_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reservations');
    }
};
